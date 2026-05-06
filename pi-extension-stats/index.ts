import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type DayUsage = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
  cost: number;
  messages: number;
};

type UsageRecord = {
  day: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
  cost: number;
  model: string;
  sessionFile: string;
  sessionId: string;
};

type Totals = DayUsage;

const DEFAULT_DAYS = 14;
const MAX_BAR_WIDTH = 24;
const COST_BAR_WIDTH = 10;

function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}

function formatCost(cost: number): string {
  if (cost <= 0) return "$0.000";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 10) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

function emptyUsage(): DayUsage {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0, cost: 0, messages: 0 };
}

function getDayKey(timestamp: string): string | null {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

function parseDaysArg(args: string): { mode: "range"; days: number } | { mode: "all" } | null {
  const trimmed = args.trim().toLowerCase();
  if (!trimmed) return { mode: "range", days: DEFAULT_DAYS };
  if (trimmed === "all") return { mode: "all" };

  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n <= 0 || n > 3650) return null;
  return { mode: "range", days: n };
}

function listSessionFiles(sessionDir: string): string[] {
  try {
    return fs
      .readdirSync(sessionDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".jsonl"))
      .map((e) => path.join(sessionDir, e.name));
  } catch {
    return [];
  }
}

function collectUsageRecords(sessionFiles: string[]): UsageRecord[] {
  const records: UsageRecord[] = [];

  for (const file of sessionFiles) {
    let content: string;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const sessionId = path.basename(file, ".jsonl");

    for (const line of content.split(/\r?\n/)) {
      if (!line.trim()) continue;

      let entry: any;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      if (entry?.type !== "message") continue;
      if (entry?.message?.role !== "assistant") continue;

      const usage = entry?.message?.usage;
      if (!usage || typeof usage !== "object") continue;

      const day = getDayKey(entry?.timestamp ?? "");
      if (!day) continue;

      const input = Number(usage.input ?? 0) || 0;
      const output = Number(usage.output ?? 0) || 0;
      const cacheRead = Number(usage.cacheRead ?? 0) || 0;
      const cacheWrite = Number(usage.cacheWrite ?? 0) || 0;
      const total = Number(usage.totalTokens ?? input + output + cacheRead + cacheWrite) || 0;
      const cost = Number(usage?.cost?.total ?? 0) || 0;
      const provider = String(entry?.message?.provider ?? "unknown");
      const model = String(entry?.message?.responseModel ?? entry?.message?.model ?? "unknown");

      records.push({
        day,
        input,
        output,
        cacheRead,
        cacheWrite,
        total,
        cost,
        model: `${provider}/${model}`,
        sessionFile: file,
        sessionId,
      });
    }
  }

  return records;
}

function aggregateUsageByDay(records: UsageRecord[]): Map<string, DayUsage> {
  const byDay = new Map<string, DayUsage>();
  for (const r of records) {
    const prev = byDay.get(r.day) ?? emptyUsage();
    prev.input += r.input;
    prev.output += r.output;
    prev.cacheRead += r.cacheRead;
    prev.cacheWrite += r.cacheWrite;
    prev.total += r.total;
    prev.cost += r.cost;
    prev.messages += 1;
    byDay.set(r.day, prev);
  }
  return byDay;
}

function buildDayRange(days: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }

  return keys;
}

function getScopeDayKeys(byDay: Map<string, DayUsage>, args: { mode: "range"; days: number } | { mode: "all" }): string[] {
  return args.mode === "all"
    ? Array.from(byDay.keys()).sort((a, b) => a.localeCompare(b))
    : buildDayRange(args.days);
}

function sumUsage(byDay: Map<string, DayUsage>, dayKeys: string[]): Totals {
  return dayKeys.reduce((acc, day) => {
    const usage = byDay.get(day) ?? emptyUsage();
    acc.input += usage.input;
    acc.output += usage.output;
    acc.cacheRead += usage.cacheRead;
    acc.cacheWrite += usage.cacheWrite;
    acc.total += usage.total;
    acc.cost += usage.cost;
    acc.messages += usage.messages;
    return acc;
  }, emptyUsage());
}

function scopedRecords(records: UsageRecord[], dayKeys: string[]): UsageRecord[] {
  const daySet = new Set(dayKeys);
  return records.filter((r) => daySet.has(r.day));
}

function aggregateModelUsage(records: UsageRecord[], dayKeys: string[]): Array<{ model: string; tokens: number; percent: number; cost: number; costPercent: number; avgCostPerMillion: number; avgOutputTokens: number; messages: number }> {
  const scoped = scopedRecords(records, dayKeys);
  const modelTotals = new Map<string, { tokens: number; output: number; cost: number; messages: number }>();
  const totalTokens = scoped.reduce((acc, r) => acc + r.total, 0);
  const totalCost = scoped.reduce((acc, r) => acc + r.cost, 0);

  for (const r of scoped) {
    const prev = modelTotals.get(r.model) ?? { tokens: 0, output: 0, cost: 0, messages: 0 };
    prev.tokens += r.total;
    prev.output += r.output;
    prev.cost += r.cost;
    prev.messages += 1;
    modelTotals.set(r.model, prev);
  }

  if (totalTokens <= 0) return [];

  return Array.from(modelTotals.entries())
    .map(([model, v]) => ({
      model,
      tokens: v.tokens,
      percent: (v.tokens / totalTokens) * 100,
      cost: v.cost,
      costPercent: totalCost > 0 ? (v.cost / totalCost) * 100 : 0,
      avgCostPerMillion: v.tokens > 0 ? (v.cost / v.tokens) * 1_000_000 : 0,
      avgOutputTokens: v.messages > 0 ? v.output / v.messages : 0,
      messages: v.messages,
    }))
    .sort((a, b) => b.cost - a.cost || b.tokens - a.tokens)
    .slice(0, 5);
}

function aggregateExpensiveSessions(records: UsageRecord[], dayKeys: string[]): Array<{ day: string; model: string; tokens: number; cost: number; sessionId: string; file: string }> {
  const sessions = new Map<string, { day: string; modelTokens: Map<string, number>; tokens: number; cost: number; sessionId: string; file: string }>();

  for (const r of scopedRecords(records, dayKeys)) {
    const prev = sessions.get(r.sessionFile) ?? { day: r.day, modelTokens: new Map(), tokens: 0, cost: 0, sessionId: r.sessionId, file: r.sessionFile };
    if (r.day < prev.day) prev.day = r.day;
    prev.tokens += r.total;
    prev.cost += r.cost;
    prev.modelTokens.set(r.model, (prev.modelTokens.get(r.model) ?? 0) + r.total);
    sessions.set(r.sessionFile, prev);
  }

  return Array.from(sessions.values())
    .map((s) => ({
      day: s.day,
      model: Array.from(s.modelTokens.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown",
      tokens: s.tokens,
      cost: s.cost,
      sessionId: s.sessionId,
      file: path.basename(s.file),
    }))
    .sort((a, b) => b.cost - a.cost || b.tokens - a.tokens)
    .slice(0, 5);
}

function buildGraphLines(byDay: Map<string, DayUsage>, dayKeys: string[]): string[] {
  if (dayKeys.length === 0) {
    return ["No usage data found yet."];
  }

  const data = dayKeys.map((day) => ({ day, usage: byDay.get(day) ?? emptyUsage() }));
  const maxTotal = Math.max(...data.map((d) => d.usage.total), 0);
  const maxCost = Math.max(...data.map((d) => d.usage.cost), 0);
  const lines: string[] = [];

  for (const { day, usage } of data) {
    const tokenBarLen = usage.total <= 0 || maxTotal <= 0 ? 0 : Math.max(1, Math.round((usage.total / maxTotal) * MAX_BAR_WIDTH));
    const costBarLen = usage.cost <= 0 || maxCost <= 0 ? 0 : Math.max(1, Math.round((usage.cost / maxCost) * COST_BAR_WIDTH));
    const tokenBar = "█".repeat(tokenBarLen).padEnd(MAX_BAR_WIDTH, "·");
    const costBar = "$".repeat(costBarLen).padEnd(COST_BAR_WIDTH, "·");

    lines.push(
      `${day} ${tokenBar} ${formatTokens(usage.total)} tok ${costBar} ${formatCost(usage.cost)} (↑${formatTokens(usage.input)} ↓${formatTokens(usage.output)} R${formatTokens(usage.cacheRead)} W${formatTokens(usage.cacheWrite)})`,
    );
  }

  const totals = sumUsage(byDay, dayKeys);
  lines.push(
    "",
    `Σ ${formatTokens(totals.total)} tok (↑${formatTokens(totals.input)} ↓${formatTokens(totals.output)} R${formatTokens(totals.cacheRead)} W${formatTokens(totals.cacheWrite)}) · ${formatCost(totals.cost)}`,
  );

  return lines;
}

function buildCostTrendLines(byDay: Map<string, DayUsage>, dayKeys: string[]): string[] {
  const totals = sumUsage(byDay, dayKeys);
  const activeDays = dayKeys.filter((d) => (byDay.get(d)?.total ?? 0) > 0).length;
  const divisor = Math.max(activeDays, dayKeys.length, 1);
  const avgPerDay = totals.cost / divisor;
  const projectedMonthly = avgPerDay * 30;
  const highest = dayKeys
    .map((day) => ({ day, cost: byDay.get(day)?.cost ?? 0 }))
    .sort((a, b) => b.cost - a.cost)[0];

  return [
    `Cost trend: avg/day ${formatCost(avgPerDay)} · projected 30d ${formatCost(projectedMonthly)} · highest ${highest && highest.cost > 0 ? `${highest.day} ${formatCost(highest.cost)}` : "n/a"}`,
  ];
}

function buildCacheEfficiencyLines(totals: Totals): string[] {
  const hitRate = totals.total > 0 ? (totals.cacheRead / totals.total) * 100 : 0;
  const nonCacheTokens = totals.input + totals.output + totals.cacheWrite;
  const avgCostPerNonCacheToken = nonCacheTokens > 0 && totals.cost > 0 ? totals.cost / nonCacheTokens : 0;
  const estimatedSavings = totals.cacheRead * avgCostPerNonCacheToken;
  const savingsPart = estimatedSavings > 0 ? ` · est. cache savings ${formatCost(estimatedSavings)}` : "";

  return [`Cache hit: ${hitRate.toFixed(1)}% · reads ${formatTokens(totals.cacheRead)} · writes ${formatTokens(totals.cacheWrite)}${savingsPart}`];
}

export default function statsExtension(pi: ExtensionAPI) {
  pi.registerCommand("stats", {
    description: "Show token usage graph per day. Usage: /stats, /stats 30, /stats all",
    handler: async (args, ctx) => {
      const parsedArgs = parseDaysArg(args);
      if (!parsedArgs) {
        ctx.ui.notify("Usage: /stats [days|all]   e.g. /stats, /stats 30, /stats all", "warning");
        return;
      }

      const sessionDir = ctx.sessionManager.getSessionDir();
      const files = listSessionFiles(sessionDir);
      if (files.length === 0) {
        ctx.ui.notify("No sessions found for this workspace yet.", "info");
        return;
      }

      const records = collectUsageRecords(files);
      const byDay = aggregateUsageByDay(records);
      const dayKeys = getScopeDayKeys(byDay, parsedArgs);
      const lines = buildGraphLines(byDay, dayKeys);
      const totals = sumUsage(byDay, dayKeys);
      const topModels = aggregateModelUsage(records, dayKeys);
      const topSessions = aggregateExpensiveSessions(records, dayKeys);
      const scopeLabel = parsedArgs.mode === "all" ? "all days" : `last ${parsedArgs.days} days`;

      const modelLines =
        topModels.length === 0
          ? ["Model comparison: no model usage in selected range"]
          : [
              "Model comparison:",
              ...topModels.map((m, i) => {
                const costPart = totals.cost > 0 ? ` · ${m.costPercent.toFixed(1)}% spend` : "";
                return `${i + 1}. ${m.model} — ${m.percent.toFixed(1)}% tokens (${formatTokens(m.tokens)}) · ${formatCost(m.cost)}${costPart} · ${formatCost(m.avgCostPerMillion)}/1M tok · avg ↓${formatTokens(Math.round(m.avgOutputTokens))}/msg`;
              }),
            ];

      const sessionLines =
        topSessions.length === 0
          ? ["Most expensive sessions: none in selected range"]
          : [
              "Most expensive sessions:",
              ...topSessions.map((s, i) => `${i + 1}. ${s.day} ${s.sessionId} — ${formatCost(s.cost)} · ${formatTokens(s.tokens)} tok · ${s.model} · ${s.file}`),
            ];

      ctx.ui.notify(
        `📊 Token stats (${scopeLabel}, ${files.length} sessions)\n\n${lines.join("\n")}\n\n${buildCostTrendLines(byDay, dayKeys).join("\n")}\n${buildCacheEfficiencyLines(totals).join("\n")}\n\n${modelLines.join("\n")}\n\n${sessionLines.join("\n")}`,
        "info",
      );
    },
  });
}
