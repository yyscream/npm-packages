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
};

const DEFAULT_DAYS = 14;
const MAX_BAR_WIDTH = 24;

function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
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
      });
    }
  }

  return records;
}

function aggregateUsageByDay(records: UsageRecord[]): Map<string, DayUsage> {
  const byDay = new Map<string, DayUsage>();
  for (const r of records) {
    const prev = byDay.get(r.day) ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0, cost: 0 };
    prev.input += r.input;
    prev.output += r.output;
    prev.cacheRead += r.cacheRead;
    prev.cacheWrite += r.cacheWrite;
    prev.total += r.total;
    prev.cost += r.cost;
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

function aggregateModelUsage(records: UsageRecord[], dayKeys: string[]): Array<{ model: string; tokens: number; percent: number; cost: number }> {
  if (dayKeys.length === 0) return [];

  const daySet = new Set(dayKeys);
  const modelTotals = new Map<string, { tokens: number; cost: number }>();
  let totalTokens = 0;

  for (const r of records) {
    if (!daySet.has(r.day)) continue;
    totalTokens += r.total;
    const prev = modelTotals.get(r.model) ?? { tokens: 0, cost: 0 };
    prev.tokens += r.total;
    prev.cost += r.cost;
    modelTotals.set(r.model, prev);
  }

  if (totalTokens <= 0) return [];

  return Array.from(modelTotals.entries())
    .map(([model, v]) => ({ model, tokens: v.tokens, percent: (v.tokens / totalTokens) * 100, cost: v.cost }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 3);
}

function buildGraphLines(byDay: Map<string, DayUsage>, dayKeys: string[]): string[] {
  if (dayKeys.length === 0) {
    return ["No usage data found yet."];
  }

  const data = dayKeys.map((day) => ({
    day,
    usage: byDay.get(day) ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0, cost: 0 },
  }));

  const maxTotal = Math.max(...data.map((d) => d.usage.total), 0);
  const lines: string[] = [];

  for (const { day, usage } of data) {
    const barLen =
      usage.total <= 0 || maxTotal <= 0 ? 0 : Math.max(1, Math.round((usage.total / maxTotal) * MAX_BAR_WIDTH));
    const bar = "█".repeat(barLen).padEnd(MAX_BAR_WIDTH, "·");

    lines.push(
      `${day} ${bar} ${formatTokens(usage.total)} tok (↑${formatTokens(usage.input)} ↓${formatTokens(usage.output)} R${formatTokens(usage.cacheRead)} W${formatTokens(usage.cacheWrite)})`,
    );
  }

  const totals = data.reduce(
    (acc, d) => {
      acc.input += d.usage.input;
      acc.output += d.usage.output;
      acc.cacheRead += d.usage.cacheRead;
      acc.cacheWrite += d.usage.cacheWrite;
      acc.total += d.usage.total;
      acc.cost += d.usage.cost;
      return acc;
    },
    { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0, cost: 0 },
  );

  lines.push(
    "",
    `Σ ${formatTokens(totals.total)} tok (↑${formatTokens(totals.input)} ↓${formatTokens(totals.output)} R${formatTokens(totals.cacheRead)} W${formatTokens(totals.cacheWrite)}) · $${totals.cost.toFixed(3)}`,
  );

  return lines;
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
      const topModels = aggregateModelUsage(records, dayKeys);
      const scopeLabel = parsedArgs.mode === "all" ? "all days" : `last ${parsedArgs.days} days`;

      const hasAnyModelCost = topModels.some((m) => m.cost > 0);
      const modelLines =
        topModels.length === 0
          ? ["Top models: no model usage in selected range"]
          : [
              "Top models:",
              ...topModels.map((m, i) => {
                const costPart = hasAnyModelCost ? ` · $${m.cost.toFixed(3)}` : "";
                return `${i + 1}. ${m.model} — ${m.percent.toFixed(1)}% (${formatTokens(m.tokens)} tok)${costPart}`;
              }),
            ];

      ctx.ui.notify(`📊 Token stats (${scopeLabel}, ${files.length} sessions)\n\n${lines.join("\n")}\n\n${modelLines.join("\n")}`, "info");
    },
  });
}
