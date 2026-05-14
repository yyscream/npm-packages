import * as fs from "node:fs";
import * as path from "node:path";
import { buildSessionContext, formatSkillsForPrompt } from "@earendil-works/pi-coding-agent";
import type { BuildSystemPromptOptions, ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { estimatePromptInjectionTokens, estimateTokensFromCharCount, formatTokens } from "@firstpick/pi-utils";

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
  sessionName?: string;
  sessionTitle?: string;
};

type Totals = DayUsage;

type PromptInjectionSource = {
  label: string;
  chars: number;
};

type TokenBreakdownSource = {
  label: string;
  chars: number;
};

const DEFAULT_DAYS = 14;
const MAX_BAR_WIDTH = 24;
const COST_BAR_WIDTH = 10;

function addPromptSource(sources: PromptInjectionSource[], label: string, content: string | undefined): number {
  if (!content) return 0;
  const chars = content.length;
  if (chars <= 0) return 0;
  sources.push({ label, chars });
  return chars;
}

function buildPromptInjectionSourcesFromPrompt(systemPrompt: string): PromptInjectionSource[] {
  const sources: PromptInjectionSource[] = [];
  let attributedChars = 0;

  const addRange = (label: string, start: number, end: number) => {
    if (start < 0 || end <= start) return;
    attributedChars += addPromptSource(sources, label, systemPrompt.slice(start, end));
  };

  const toolsStart = systemPrompt.indexOf("Available tools:\n");
  const toolsEnd = toolsStart >= 0 ? systemPrompt.indexOf("\n\nIn addition to the tools above", toolsStart) : -1;
  if (toolsStart >= 0 && toolsEnd > toolsStart) {
    addRange("Tools", toolsStart, toolsEnd);
  }

  const appendStart = systemPrompt.indexOf("# APPEND_SYSTEM.md");
  const projectContextStart = systemPrompt.indexOf("\n\n# Project Context\n");
  const skillsStart = systemPrompt.indexOf("\n<available_skills>");
  const dateStart = systemPrompt.indexOf("\nCurrent date:");

  if (appendStart >= 0) {
    const appendEndCandidates = [projectContextStart, skillsStart, dateStart].filter((i) => i > appendStart);
    const appendEnd = appendEndCandidates.length > 0 ? Math.min(...appendEndCandidates) : systemPrompt.length;
    addRange("APPEND_SYSTEM.md file", appendStart, appendEnd);
  }

  if (projectContextStart >= 0) {
    const contextEndCandidates = [skillsStart, dateStart].filter((i) => i > projectContextStart);
    const contextEnd = contextEndCandidates.length > 0 ? Math.min(...contextEndCandidates) : systemPrompt.length;
    const contextBlock = systemPrompt.slice(projectContextStart, contextEnd);
    const headingRegex = /^## (.+)$/gm;
    const headings = Array.from(contextBlock.matchAll(headingRegex));

    if (headings.length === 0) {
      attributedChars += addPromptSource(sources, "Project context files", contextBlock);
    } else {
      for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        const nextHeading = headings[i + 1];
        const start = heading.index;
        const end = nextHeading?.index ?? contextBlock.length;
        if (start === undefined) continue;

        const contextPath = heading[1]?.trim() ?? "unknown";
        const fileName = path.basename(contextPath);
        const label = /^AGENTS\.md$/i.test(fileName)
          ? `AGENTS.md: ${contextPath}`
          : /^CLAUDE\.md$/i.test(fileName)
            ? `CLAUDE.md: ${contextPath}`
            : `Context file: ${contextPath}`;
        attributedChars += addPromptSource(sources, label, contextBlock.slice(start, end));
      }
    }
  }

  if (skillsStart >= 0) {
    const skillsEnd = dateStart > skillsStart ? dateStart : systemPrompt.length;
    const skillsBlock = systemPrompt.slice(skillsStart, skillsEnd);
    const skillCount = (skillsBlock.match(/<skill>/g) ?? []).length;
    attributedChars += addPromptSource(sources, skillCount > 0 ? `Skills (${skillCount})` : "Skills", skillsBlock);
  }

  const piPromptChars = Math.max(0, systemPrompt.length - attributedChars);
  if (piPromptChars > 0) {
    sources.unshift({ label: "System prompt of Pi / metadata", chars: piPromptChars });
  }

  return sources.length > 0 ? sources : [{ label: "Current system prompt", chars: systemPrompt.length }];
}

function buildPromptInjectionSources(systemPrompt: string, options: BuildSystemPromptOptions | null): PromptInjectionSource[] {
  if (!options) {
    return buildPromptInjectionSourcesFromPrompt(systemPrompt);
  }

  const sources: PromptInjectionSource[] = [];
  let attributedChars = 0;

  const addSource = (label: string, content: string | undefined) => {
    attributedChars += addPromptSource(sources, label, content);
  };

  const selectedTools = options.selectedTools ?? ["read", "bash", "edit", "write"];
  const visibleTools = selectedTools.filter((name) => !!options.toolSnippets?.[name]);
  const toolsList = visibleTools.map((name) => `- ${name}: ${options.toolSnippets?.[name] ?? ""}`).join("\n");
  addSource("Tools", toolsList);

  if (options.skills && options.skills.length > 0) {
    addSource(`Skills (${options.skills.length})`, formatSkillsForPrompt(options.skills));
  }

  if (options.customPrompt) {
    addSource("Custom system prompt", options.customPrompt);
  }

  addSource("APPEND_SYSTEM.md / append-system", options.appendSystemPrompt);

  for (const contextFile of options.contextFiles ?? []) {
    const fileName = path.basename(contextFile.path);
    if (/^AGENTS\.md$/i.test(fileName)) {
      addSource(`AGENTS.md: ${contextFile.path}`, contextFile.content);
    } else if (/^CLAUDE\.md$/i.test(fileName)) {
      addSource(`CLAUDE.md: ${contextFile.path}`, contextFile.content);
    } else {
      addSource(`Context file: ${contextFile.path}`, contextFile.content);
    }
  }

  const piPromptChars = Math.max(0, systemPrompt.length - attributedChars);
  if (piPromptChars > 0) {
    sources.unshift({
      label: options.customPrompt ? "Pi prompt wrapper / metadata" : "System prompt of Pi",
      chars: piPromptChars,
    });
  }

  return sources;
}

function formatPromptInjectionLines(systemPrompt: string, options: BuildSystemPromptOptions | null): string[] {
  const sources = buildPromptInjectionSources(systemPrompt, options)
    .map((source) => ({ ...source, tokens: estimateTokensFromCharCount(source.chars) }))
    .sort((a, b) => b.tokens - a.tokens || b.chars - a.chars);
  const totalTokens = estimatePromptInjectionTokens(systemPrompt);
  const labelWidth = Math.max("Source".length, ...sources.map((source) => source.label.length));
  const tokenWidth = Math.max("Tokens".length, ...sources.map((source) => formatTokens(source.tokens).length));
  const percentWidth = "%".length;
  const separator = `├${"─".repeat(labelWidth + 2)}┼${"─".repeat(tokenWidth + 2)}┼${"─".repeat(percentWidth + 6)}┤`;
  const rows = sources.map((source) => {
    const percent = totalTokens > 0 ? `${((source.tokens / totalTokens) * 100).toFixed(1)}%` : "0.0%";
    return `│ ${source.label.padEnd(labelWidth)} │ ${formatTokens(source.tokens).padStart(tokenWidth)} │ ${percent.padStart(percentWidth + 4)} │`;
  });

  return [
    `Prompt injection: PI: ${formatTokens(totalTokens)} tok`,
    `┌${"─".repeat(labelWidth + 2)}┬${"─".repeat(tokenWidth + 2)}┬${"─".repeat(percentWidth + 6)}┐`,
    `│ ${"Source".padEnd(labelWidth)} │ ${"Tokens".padStart(tokenWidth)} │ ${"%".padStart(percentWidth + 4)} │`,
    separator,
    ...rows,
    `└${"─".repeat(labelWidth + 2)}┴${"─".repeat(tokenWidth + 2)}┴${"─".repeat(percentWidth + 6)}┘`,
  ];
}


function stringifyContextValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function summarizeMessageForTokenBreakdown(message: unknown): { label: string; chars: number } {
  const record = (message && typeof message === "object" ? message : {}) as Record<string, unknown>;
  const role = typeof record.role === "string" ? record.role : "message";
  const contentChars = stringifyContextValue(record.content).length;
  const toolCallsChars = stringifyContextValue(record.toolCalls ?? record.tool_calls).length;
  const nameChars = stringifyContextValue(record.name).length;
  const metadataChars = Math.max(0, stringifyContextValue(record).length - contentChars - toolCallsChars - nameChars);

  if (role === "assistant" && toolCallsChars > 2) {
    return { label: "Assistant messages + tool calls", chars: contentChars + toolCallsChars + metadataChars };
  }
  if (role === "tool" || role === "function") {
    return { label: "Tool results / command output", chars: stringifyContextValue(record).length };
  }
  if (role === "user") {
    return { label: "User messages / working context", chars: stringifyContextValue(record).length };
  }
  if (role === "assistant") {
    return { label: "Assistant messages", chars: stringifyContextValue(record).length };
  }
  return { label: "Other session context", chars: stringifyContextValue(record).length };
}

function buildCurrentContextTokenSources(systemPrompt: string, options: BuildSystemPromptOptions | null, ctx: { sessionManager: { getBranch(): unknown[]; getLeafId(): string | null } }): TokenBreakdownSource[] {
  const sources = new Map<string, TokenBreakdownSource>();
  const add = (label: string, chars: number) => {
    if (chars <= 0) return;
    const prev = sources.get(label);
    if (prev) {
      prev.chars += chars;
    } else {
      sources.set(label, { label, chars });
    }
  };

  for (const source of buildPromptInjectionSources(systemPrompt, options)) {
    add(source.label, source.chars);
  }

  try {
    const branch = ctx.sessionManager.getBranch() as never[];
    const sessionContext = buildSessionContext(branch, ctx.sessionManager.getLeafId());
    for (const message of sessionContext.messages) {
      const summary = summarizeMessageForTokenBreakdown(message);
      add(summary.label, summary.chars);
    }
  } catch {
    // Keep /stats tokens useful even if the session branch cannot be reconstructed.
  }

  return Array.from(sources.values());
}

function formatTokenBreakdownTable(title: string, sources: TokenBreakdownSource[], actualTotalTokens?: number | null): string[] {
  const rows = sources
    .map((source) => ({ ...source, tokens: estimateTokensFromCharCount(source.chars) }))
    .sort((a, b) => b.tokens - a.tokens || b.chars - a.chars);
  const estimatedTotalTokens = rows.reduce((sum, row) => sum + row.tokens, 0);
  const percentBase = actualTotalTokens && actualTotalTokens > 0 ? actualTotalTokens : estimatedTotalTokens;
  const labelWidth = Math.max("Source".length, ...rows.map((row) => row.label.length));
  const tokenWidth = Math.max("Tokens".length, ...rows.map((row) => formatTokens(row.tokens).length));
  const percentWidth = "%".length;
  const separator = `├${"─".repeat(labelWidth + 2)}┼${"─".repeat(tokenWidth + 2)}┼${"─".repeat(percentWidth + 6)}┤`;
  const totalLabel = actualTotalTokens && actualTotalTokens > 0 ? `${formatTokens(actualTotalTokens)} tok actual · ~${formatTokens(estimatedTotalTokens)} estimated` : `~${formatTokens(estimatedTotalTokens)} tok estimated`;

  return [
    `${title}: ${totalLabel}`,
    `┌${"─".repeat(labelWidth + 2)}┬${"─".repeat(tokenWidth + 2)}┬${"─".repeat(percentWidth + 6)}┐`,
    `│ ${"Source".padEnd(labelWidth)} │ ${"Tokens".padStart(tokenWidth)} │ ${"%".padStart(percentWidth + 4)} │`,
    separator,
    ...rows.map((row) => {
      const percent = percentBase > 0 ? `${((row.tokens / percentBase) * 100).toFixed(1)}%` : "0.0%";
      return `│ ${row.label.padEnd(labelWidth)} │ ${formatTokens(row.tokens).padStart(tokenWidth)} │ ${percent.padStart(percentWidth + 4)} │`;
    }),
    `└${"─".repeat(labelWidth + 2)}┴${"─".repeat(tokenWidth + 2)}┴${"─".repeat(percentWidth + 6)}┘`,
  ];
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

function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (!part || typeof part !== "object") return "";
        const record = part as Record<string, unknown>;
        if (typeof record.text === "string") return record.text;
        if (typeof record.content === "string") return record.content;
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function formatSessionTitle(text: string, maxLength = 72): string | undefined {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
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
    const entries: any[] = [];

    for (const line of content.split(/\r?\n/)) {
      if (!line.trim()) continue;

      try {
        entries.push(JSON.parse(line));
      } catch {
        continue;
      }
    }

    const sessionName = entries
      .filter((entry) => entry?.type === "session_info" && typeof entry?.name === "string" && entry.name.trim())
      .at(-1)?.name.trim();
    const firstUserText = entries
      .find((entry) => entry?.type === "message" && entry?.message?.role === "user")
      ?.message?.content;
    const sessionTitle = formatSessionTitle(extractMessageText(firstUserText));

    for (const entry of entries) {
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
        sessionName,
        sessionTitle,
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

function aggregateModelUsage(records: UsageRecord[], dayKeys: string[], limit = 10): Array<{ model: string; tokens: number; percent: number; cost: number; costPercent: number; avgCostPerMillion: number; avgOutputTokens: number; messages: number }> {
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
    .slice(0, limit);
}

function aggregateExpensiveSessions(records: UsageRecord[], dayKeys: string[], limit = 10): Array<{ day: string; model: string; tokens: number; cost: number; sessionId: string; sessionName?: string; sessionTitle?: string; displayName: string }> {
  const sessions = new Map<string, { day: string; modelTokens: Map<string, number>; tokens: number; cost: number; sessionId: string; sessionName?: string; sessionTitle?: string }>();

  for (const r of scopedRecords(records, dayKeys)) {
    const prev = sessions.get(r.sessionFile) ?? { day: r.day, modelTokens: new Map(), tokens: 0, cost: 0, sessionId: r.sessionId, sessionName: r.sessionName, sessionTitle: r.sessionTitle };
    if (r.day < prev.day) prev.day = r.day;
    prev.tokens += r.total;
    prev.cost += r.cost;
    if (!prev.sessionName && r.sessionName) prev.sessionName = r.sessionName;
    if (!prev.sessionTitle && r.sessionTitle) prev.sessionTitle = r.sessionTitle;
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
      sessionName: s.sessionName,
      sessionTitle: s.sessionTitle,
      displayName: s.sessionName ? `"${s.sessionName}"` : s.sessionTitle ? `"${s.sessionTitle}"` : s.sessionId,
    }))
    .sort((a, b) => b.cost - a.cost || b.tokens - a.tokens)
    .slice(0, limit);
}

function buildGraphLines(byDay: Map<string, DayUsage>, dayKeys: string[], omitZeroDays = false): string[] {
  if (dayKeys.length === 0) {
    return ["No usage data found yet."];
  }

  const data = dayKeys
    .map((day) => ({ day, usage: byDay.get(day) ?? emptyUsage() }))
    .filter((d) => !omitZeroDays || d.usage.total > 0 || d.usage.cost > 0);
  const maxTotal = Math.max(...data.map((d) => d.usage.total), 0);
  const maxCost = Math.max(...data.map((d) => d.usage.cost), 0);
  const lines: string[] = [];

  if (data.length === 0) {
    return ["No non-zero usage data found in selected range."];
  }

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
  const activeKeys = dayKeys.filter((d) => (byDay.get(d)?.cost ?? 0) > 0 || (byDay.get(d)?.total ?? 0) > 0);
  const calendarAvg = totals.cost / Math.max(dayKeys.length, 1);
  const activeAvg = totals.cost / Math.max(activeKeys.length, 1);
  const projectedMonthly = calendarAvg * 30;
  const highest = dayKeys
    .map((day) => ({ day, cost: byDay.get(day)?.cost ?? 0, tokens: byDay.get(day)?.total ?? 0 }))
    .sort((a, b) => b.cost - a.cost)[0];
  const lastActive = activeKeys.at(-1);
  const lastActiveCost = lastActive ? (byDay.get(lastActive)?.cost ?? 0) : 0;

  return [
    `Cost trend: avg/day ${formatCost(calendarAvg)} · active-day avg ${formatCost(activeAvg)} · projected 30d ${formatCost(projectedMonthly)} · highest ${highest && highest.cost > 0 ? `${highest.day} ${formatCost(highest.cost)} (${formatTokens(highest.tokens)} tok)` : "n/a"} · active days ${activeKeys.length}/${dayKeys.length}`,
    `Latest active day: ${lastActive ? `${lastActive} ${formatCost(lastActiveCost)} · ${formatTokens(byDay.get(lastActive)?.total ?? 0)} tok` : "n/a"}`,
  ];
}

function buildCacheEfficiencyLines(totals: Totals): string[] {
  const hitRate = totals.total > 0 ? (totals.cacheRead / totals.total) * 100 : 0;
  const nonCacheTokens = totals.input + totals.output + totals.cacheWrite;
  const inputShare = totals.total > 0 ? (totals.input / totals.total) * 100 : 0;
  const outputShare = totals.total > 0 ? (totals.output / totals.total) * 100 : 0;
  const avgCostPerNonCacheToken = nonCacheTokens > 0 && totals.cost > 0 ? totals.cost / nonCacheTokens : 0;
  const estimatedSavings = totals.cacheRead * avgCostPerNonCacheToken;
  const savingsPart = estimatedSavings > 0 ? ` · est. cache savings ${formatCost(estimatedSavings)}` : "";

  return [
    `Cache hit: ${hitRate.toFixed(1)}% · reads ${formatTokens(totals.cacheRead)} · writes ${formatTokens(totals.cacheWrite)}${savingsPart}`,
    `Token mix: input ${formatTokens(totals.input)} (${inputShare.toFixed(1)}%) · output ${formatTokens(totals.output)} (${outputShare.toFixed(1)}%) · non-cache ${formatTokens(nonCacheTokens)} · total ${formatTokens(totals.total)}`,
  ];
}

export default function statsExtension(pi: ExtensionAPI) {
  let latestSystemPromptOptions: BuildSystemPromptOptions | null = null;

  pi.on("before_agent_start", async (event) => {
    latestSystemPromptOptions = event.systemPromptOptions;
  });

  const showCurrentContextTokens = (ctx: ExtensionCommandContext) => {
    const usage = ctx.getContextUsage();
    const contextSources = buildCurrentContextTokenSources(ctx.getSystemPrompt(), latestSystemPromptOptions, ctx);
    const contextWindow = usage?.contextWindow ? ` / ${formatTokens(usage.contextWindow)} window` : "";
    const percent = usage?.percent !== null && usage?.percent !== undefined ? ` (${usage.percent.toFixed(1)}%)` : "";
    ctx.ui.notify(`${formatTokenBreakdownTable("Current context", contextSources, usage?.tokens).join("\n")}\nContext usage: ${usage?.tokens ? formatTokens(usage.tokens) : "?"}${contextWindow}${percent}`, "info");
  };

  pi.registerCommand("stats-tokens", {
    description: "Show current context token breakdown by source/type.",
    handler: async (_args, ctx) => {
      showCurrentContextTokens(ctx);
    },
  });

  const loadStatsData = (ctx: ExtensionCommandContext, parsedArgs: { mode: "range"; days: number } | { mode: "all" }) => {
    const sessionDir = ctx.sessionManager.getSessionDir();
    const files = listSessionFiles(sessionDir);
    const records = collectUsageRecords(files);
    const byDay = aggregateUsageByDay(records);
    const dayKeys = getScopeDayKeys(byDay, parsedArgs);
    const totals = sumUsage(byDay, dayKeys);
    const scopeLabel = parsedArgs.mode === "all" ? "all days" : `last ${parsedArgs.days} days`;
    return { files, records, byDay, dayKeys, totals, scopeLabel };
  };

  const parseStatsCommandArgs = (args: string, ctx: ExtensionCommandContext) => {
    const parsedArgs = parseDaysArg(args);
    if (!parsedArgs) {
      ctx.ui.notify("Usage: command [days|all]   e.g. /stats-last, /stats-last 30, /stats-last all", "warning");
      return null;
    }
    const data = loadStatsData(ctx, parsedArgs);
    if (data.files.length === 0) {
      ctx.ui.notify("No sessions found for this workspace yet.", "info");
      return null;
    }
    return data;
  };

  const formatModelComparisonLines = (records: UsageRecord[], dayKeys: string[], totals: Totals) => {
    const topModels = aggregateModelUsage(records, dayKeys, 20);
    return topModels.length === 0
      ? ["Model comparison: no model usage in selected range"]
      : [
          "Model comparison:",
          ...topModels.map((m, i) => {
            const costPart = totals.cost > 0 ? ` · ${m.costPercent.toFixed(1)}% spend` : "";
            return `${i + 1}. ${m.model} — ${m.percent.toFixed(1)}% tokens (${formatTokens(m.tokens)}) · ${formatCost(m.cost)}${costPart} · ${formatCost(m.avgCostPerMillion)}/1M tok · avg ↓${formatTokens(Math.round(m.avgOutputTokens))}/msg · ${m.messages} msgs`;
          }),
        ];
  };

  const formatExpensiveSessionLines = (records: UsageRecord[], dayKeys: string[]) => {
    const topSessions = aggregateExpensiveSessions(records, dayKeys, 20);
    return topSessions.length === 0
      ? ["Most expensive sessions: none in selected range"]
      : [
          "Most expensive sessions:",
          ...topSessions.map((s, i) => `${i + 1}. ${s.day} ${s.displayName} — ${formatCost(s.cost)} · ${formatTokens(s.tokens)} tok · ${s.model}`),
        ];
  };

  const registerScopedStatsCommand = (name: string, description: string, render: (data: ReturnType<typeof loadStatsData>, ctx: ExtensionCommandContext) => string[]) => {
    pi.registerCommand(name, {
      description,
      handler: async (args, ctx) => {
        const data = parseStatsCommandArgs(args, ctx);
        if (!data) return;
        ctx.ui.notify(render(data, ctx).join("\n"), "info");
      },
    });
  };

  registerScopedStatsCommand("stats-most-expense", "Show most expensive sessions. Usage: /stats-most-expense [days|all]", (data) =>
    formatExpensiveSessionLines(data.records, data.dayKeys),
  );

  registerScopedStatsCommand("stats-model-compare", "Show model token/cost comparison. Usage: /stats-model-compare [days|all]", (data) =>
    formatModelComparisonLines(data.records, data.dayKeys, data.totals),
  );

  registerScopedStatsCommand("stats-cost-trend", "Show cost trend and projections. Usage: /stats-cost-trend [days|all]", (data) =>
    buildCostTrendLines(data.byDay, data.dayKeys),
  );

  registerScopedStatsCommand("stats-cache", "Show cache efficiency and token mix. Usage: /stats-cache [days|all]", (data) =>
    buildCacheEfficiencyLines(data.totals),
  );

  registerScopedStatsCommand("stats-last", "Show non-zero daily usage graph. Usage: /stats-last [days|all]", (data, ctx) => {
    const promptInjectionTokens = estimatePromptInjectionTokens(ctx.getSystemPrompt());
    return [`📊 Token stats (${data.scopeLabel}, ${data.files.length} sessions) · PI: ${formatTokens(promptInjectionTokens)} tok`, "", ...buildGraphLines(data.byDay, data.dayKeys, true)];
  });

  pi.registerCommand("stats-pi", {
    description: "Show prompt-injection token breakdown.",
    handler: async (_args, ctx) => {
      ctx.ui.notify(formatPromptInjectionLines(ctx.getSystemPrompt(), latestSystemPromptOptions).join("\n"), "info");
    },
  });

  pi.registerCommand("stats", {
    description: "Show token usage dashboard. Usage: /stats, /stats 30, /stats all. Details: /stats-tokens, /stats-pi, /stats-last, /stats-most-expense, /stats-model-compare, /stats-cost-trend, /stats-cache",
    handler: async (args, ctx) => {
      const trimmedArgs = args.trim().toLowerCase();
      if (trimmedArgs === "tokens") {
        showCurrentContextTokens(ctx);
        return;
      }

      const data = parseStatsCommandArgs(args, ctx);
      if (!data) return;

      const systemPrompt = ctx.getSystemPrompt();
      const promptInjectionTokens = estimatePromptInjectionTokens(systemPrompt);
      const graphLines = buildGraphLines(data.byDay, data.dayKeys, true);
      const promptInjectionLines = formatPromptInjectionLines(systemPrompt, latestSystemPromptOptions);
      const modelLines = formatModelComparisonLines(data.records, data.dayKeys, data.totals).slice(0, 7);
      const sessionLines = formatExpensiveSessionLines(data.records, data.dayKeys).slice(0, 7);
      const commandLines = [
        "Detailed commands:",
        "/stats-last · /stats-most-expense · /stats-model-compare · /stats-pi · /stats-cost-trend · /stats-cache · /stats-tokens",
      ];

      ctx.ui.notify(
        `📊 Token stats (${data.scopeLabel}, ${data.files.length} sessions) · PI: ${formatTokens(promptInjectionTokens)} tok\n\n${graphLines.join("\n")}\n\n${promptInjectionLines.join("\n")}\n\n${buildCostTrendLines(data.byDay, data.dayKeys).join("\n")}\n${buildCacheEfficiencyLines(data.totals).join("\n")}\n\n${modelLines.join("\n")}\n\n${sessionLines.join("\n")}\n\n${commandLines.join("\n")}`,
        "info",
      );
    },
  });
}
