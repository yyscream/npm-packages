import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { matchesKey } from "@earendil-works/pi-tui";

type PlanRuntimeState = {
  active: boolean;
  planPath: string;
  resolvedPlanPath: string;
  maxIdleTurns: number;
  idleTurns: number;
};

type PlanResolution = {
  displayPath: string;
  readPath: string;
};

type PlanChoice = PlanResolution & {
  label: string;
  sortTime: number;
};

const DEFAULT_PATH = "PLAN.md";
const EXECUTOR_STATUS_KEY = "plan-executor";
const COMPLETION_MARKER = ".plan-executor-complete";

function getAgentDir(): string {
  return process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");
}

function getArchivedPlansRoot(): string {
  return join(getAgentDir(), "docs");
}

function slugifyTopic(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "plan";
}

function completionMarkerPath(planPath: string): string {
  return join(dirname(planPath), COMPLETION_MARKER);
}

function isPlanMarkedComplete(planPath: string): boolean {
  return existsSync(completionMarkerPath(planPath));
}

function markPlanComplete(planPath: string): void {
  const markerPath = completionMarkerPath(planPath);
  mkdirSync(dirname(markerPath), { recursive: true });
  writeFileSync(markerPath, `completedAt=${new Date().toISOString()}\nplan=${planPath}\n`, "utf8");
}

function displayArchivedPlanPath(topic: string): string {
  return `~/.pi/agent/docs/${topic}/PLAN.md`;
}

function createPlanChoice(displayPath: string, readPath: string, prefix: string): PlanChoice {
  const progress = parsePlanProgress(readFileSync(readPath, "utf8"));
  const stat = statSync(readPath);
  return {
    displayPath,
    readPath,
    label: `${prefix}: ${displayPath} (${progress.done}/${progress.total || 0} done)`,
    sortTime: stat.mtimeMs,
  };
}

function listAvailablePlans(cwd: string): PlanChoice[] {
  const choices: PlanChoice[] = [];
  const workspacePlan = resolve(cwd, DEFAULT_PATH);
  if (existsSync(workspacePlan) && !isPlanMarkedComplete(workspacePlan)) {
    choices.push(createPlanChoice(DEFAULT_PATH, workspacePlan, "workspace"));
  }

  const docsRoot = getArchivedPlansRoot();
  if (existsSync(docsRoot)) {
    for (const entry of readdirSync(docsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const planPath = join(docsRoot, entry.name, "PLAN.md");
      if (!existsSync(planPath) || isPlanMarkedComplete(planPath)) continue;
      choices.push(createPlanChoice(displayArchivedPlanPath(entry.name), planPath, "archive"));
    }
  }

  choices.sort((a, b) => b.sortTime - a.sortTime || a.label.localeCompare(b.label));
  return choices;
}

function findLatestArchivedPlan(cwd: string): string | undefined {
  const latest = listAvailablePlans(cwd).filter((choice) => choice.readPath.startsWith(getArchivedPlansRoot()))[0];
  return latest?.readPath;
}

function resolvePlanPath(cwd: string, requestedPath: string): PlanResolution {
  const requested = (requestedPath || DEFAULT_PATH).trim() || DEFAULT_PATH;
  const directPath = isAbsolute(requested) ? requested : resolve(cwd, requested);
  if (existsSync(directPath) && !isPlanMarkedComplete(directPath)) {
    return { displayPath: requested, readPath: directPath };
  }

  const docsRoot = getArchivedPlansRoot();
  const topic = slugifyTopic(requested.replace(/(?:^|\/)PLAN\.md$/i, ""));
  const topicPlan = join(docsRoot, topic, "PLAN.md");
  if (requested !== DEFAULT_PATH && existsSync(topicPlan) && !isPlanMarkedComplete(topicPlan)) {
    return { displayPath: displayArchivedPlanPath(topic), readPath: topicPlan };
  }

  if (requested === DEFAULT_PATH) {
    const latestArchivedPlan = findLatestArchivedPlan(cwd);
    if (latestArchivedPlan) {
      const topicName = basename(resolve(latestArchivedPlan, ".."));
      return { displayPath: displayArchivedPlanPath(topicName), readPath: latestArchivedPlan };
    }
  }

  return { displayPath: requested, readPath: directPath };
}

async function pickPlan(ctx: {
  cwd: string;
  hasUI: boolean;
  ui: {
    custom?: <T>(factory: (tui: { requestRender: () => void }, theme: { fg: (color: string, text: string) => string; bold: (text: string) => string }, keybindings: unknown, done: (value: T) => void) => unknown) => Promise<T>;
    select: (title: string, options: string[]) => Promise<string | undefined>;
    notify: (message: string, level?: "info" | "warning" | "error" | "success") => void;
  };
}): Promise<PlanResolution | undefined> {
  const choices = listAvailablePlans(ctx.cwd);
  if (choices.length === 0) {
    ctx.ui.notify("No incomplete PLAN.md files found in the workspace or ~/.pi/agent/docs/*/PLAN.md.", "warning");
    return undefined;
  }

  if (!ctx.hasUI || !ctx.ui.custom) {
    const labels = choices.map((choice) => choice.label);
    const selected = await ctx.ui.select("Choose a plan to execute", labels);
    const choice = choices.find((candidate) => candidate.label === selected);
    return choice ? { displayPath: choice.displayPath, readPath: choice.readPath } : undefined;
  }

  const selectedChoice = await ctx.ui.custom<PlanChoice | undefined>((tui, theme, _keybindings, done) => {
    let selectedIndex = 0;
    let preview = false;
    let previewOffset = 0;
    const visibleRows = Math.min(10, choices.length);

    const selected = () => choices[Math.max(0, Math.min(selectedIndex, choices.length - 1))];
    const move = (delta: number) => {
      selectedIndex = Math.max(0, Math.min(choices.length - 1, selectedIndex + delta));
      previewOffset = 0;
    };

    const previewLines = (width: number): string[] => {
      const choice = selected();
      if (!choice) return [];
      const raw = readFileSync(choice.readPath, "utf8").split(/\r?\n/);
      const maxRows = 18;
      const window = raw.slice(previewOffset, previewOffset + maxRows);
      const header = theme.fg("accent", theme.bold(`Preview: ${choice.displayPath}`));
      const body = window.map((line, index) => {
        const lineNo = String(previewOffset + index + 1).padStart(4, " ");
        const clipped = line.length > width - 8 ? `${line.slice(0, Math.max(0, width - 9))}…` : line;
        return `${theme.fg("dim", lineNo)} │ ${clipped}`;
      });
      const footer = theme.fg("dim", "v close preview • ↑↓ scroll • enter execute • esc cancel");
      return [header, ...body, footer];
    };

    return {
      render(width: number) {
        if (preview) return previewLines(width);

        const lines = [theme.fg("accent", theme.bold("Choose a plan to execute"))];
        const start = Math.max(0, Math.min(selectedIndex - Math.floor(visibleRows / 2), choices.length - visibleRows));
        const shown = choices.slice(start, start + visibleRows);
        for (let i = 0; i < shown.length; i++) {
          const actualIndex = start + i;
          const choice = shown[i];
          const prefix = actualIndex === selectedIndex ? theme.fg("accent", "› ") : "  ";
          const text = actualIndex === selectedIndex ? theme.fg("accent", choice.label) : choice.label;
          lines.push(`${prefix}${text}`);
        }
        if (choices.length > visibleRows) {
          lines.push(theme.fg("dim", `${selectedIndex + 1}/${choices.length}`));
        }
        lines.push(theme.fg("dim", "↑↓ navigate • enter execute • v view plan • esc cancel"));
        return lines.map((line) => line.length > width ? `${line.slice(0, Math.max(0, width - 1))}…` : line);
      },
      invalidate() {},
      handleInput(data: string) {
        if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) return done(undefined);
        if (matchesKey(data, "enter") || matchesKey(data, "return")) return done(selected());
        if (data === "v" || data === "V") {
          preview = !preview;
          previewOffset = 0;
          tui.requestRender();
          return;
        }
        if (matchesKey(data, "up") || data === "k") {
          if (preview) previewOffset = Math.max(0, previewOffset - 1);
          else move(-1);
          tui.requestRender();
          return;
        }
        if (matchesKey(data, "down") || data === "j") {
          if (preview) previewOffset += 1;
          else move(1);
          tui.requestRender();
        }
      },
    };
  });

  return selectedChoice ? { displayPath: selectedChoice.displayPath, readPath: selectedChoice.readPath } : undefined;
}

function updateExecutorStatus(ctx: { hasUI: boolean; ui: { setStatus: (key: string, value: string) => void; theme: { fg: (color: string, text: string) => string } } }, active: boolean) {
  if (!ctx.hasUI) return;
  if (active) {
    ctx.ui.setStatus(EXECUTOR_STATUS_KEY, ctx.ui.theme.fg("error", "Executor"));
    return;
  }
  ctx.ui.setStatus(EXECUTOR_STATUS_KEY, "");
}

function parsePlanProgress(markdown: string) {
  const matches = markdown.match(/^\s*[-*]\s+\[( |x|X)\]\s+/gm) ?? [];
  const done = (markdown.match(/^\s*[-*]\s+\[(x|X)\]\s+/gm) ?? []).length;
  const total = matches.length;
  return { total, done, remaining: Math.max(0, total - done) };
}

export default function planExecutorExtension(pi: ExtensionAPI) {
  const state: PlanRuntimeState = {
    active: false,
    planPath: DEFAULT_PATH,
    resolvedPlanPath: resolve(process.cwd(), DEFAULT_PATH),
    maxIdleTurns: 3,
    idleTurns: 0,
  };
  let unsubscribeAbortKeys: (() => void) | undefined;

  const clearAbortKeys = () => {
    unsubscribeAbortKeys?.();
    unsubscribeAbortKeys = undefined;
  };

  const stopExecutor = (ctx: { hasUI: boolean; ui: { setStatus: (key: string, value: string) => void; theme: { fg: (color: string, text: string) => string }; notify: (message: string, level?: "info" | "warning" | "error" | "success") => void } }, reason: string) => {
    state.active = false;
    clearAbortKeys();
    updateExecutorStatus(ctx, false);
    ctx.ui.notify(reason, "warning");
  };

  const armAbortKeys = (ctx: { hasUI: boolean; ui: { onTerminalInput?: (handler: (data: string) => { consume?: boolean } | void) => () => void; setStatus: (key: string, value: string) => void; theme: { fg: (color: string, text: string) => string }; notify: (message: string, level?: "info" | "warning" | "error" | "success") => void } }) => {
    if (!ctx.hasUI || !ctx.ui.onTerminalInput || unsubscribeAbortKeys) return;
    unsubscribeAbortKeys = ctx.ui.onTerminalInput((data) => {
      if (!state.active) return;
      if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c")) {
        stopExecutor(ctx, "Plan executor aborted.");
        return { consume: true };
      }
    });
  };

  pi.registerCommand("execute-plan", {
    description: "Execute PLAN.md until all checklist items are completed",
    handler: async (args, ctx) => {
      const requested = args.trim();
      const resolution = requested ? resolvePlanPath(ctx.cwd, requested) : await pickPlan(ctx);
      if (!resolution) return;

      state.active = true;
      state.planPath = resolution.displayPath;
      state.resolvedPlanPath = resolution.readPath;
      state.idleTurns = 0;

      pi.sendUserMessage(
        `Start autonomous plan execution for ${state.planPath}. Keep working until every markdown checklist item is checked. After each implementation step, update ${state.planPath}, run relevant verification, and continue to the next unchecked item until complete.`,
      );

      updateExecutorStatus(ctx, true);
      armAbortKeys(ctx);
      ctx.ui.notify(`Plan executor started: ${state.planPath} (Esc/Ctrl+C to abort)`, "success");
    },
  });

  pi.registerCommand("stop-plan", {
    description: "Stop active PLAN executor loop",
    handler: async (_args, ctx) => {
      state.active = false;
      clearAbortKeys();
      updateExecutorStatus(ctx, false);
      ctx.ui.notify("Plan executor stopped", "info");
    },
  });

  pi.registerCommand("plan-status", {
    description: "Show current PLAN executor status",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        `active=${state.active} plan=${state.planPath} resolved=${state.resolvedPlanPath} idleTurns=${state.idleTurns}/${state.maxIdleTurns}`,
        "info",
      );
    },
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (!state.active) return;

    try {
      const plan = await readFile(state.resolvedPlanPath, "utf8");
      const progress = parsePlanProgress(plan);

      if (progress.total === 0) {
        state.active = false;
        clearAbortKeys();
        updateExecutorStatus(ctx, false);
        ctx.ui.notify(`No checklist items found in ${state.planPath}. Stopping executor.`, "warning");
        return;
      }

      if (progress.remaining === 0) {
        markPlanComplete(state.resolvedPlanPath);
        state.active = false;
        clearAbortKeys();
        updateExecutorStatus(ctx, false);
        ctx.ui.notify(`Plan completed and marked done: ${state.planPath} (${progress.done}/${progress.total})`, "success");
        return;
      }

      state.idleTurns += 1;
      if (state.idleTurns > state.maxIdleTurns) {
        state.active = false;
        clearAbortKeys();
        updateExecutorStatus(ctx, false);
        ctx.ui.notify(
          `Plan executor stopped after ${state.maxIdleTurns} follow-ups without completion.`,
          "warning",
        );
        return;
      }

      pi.sendUserMessage(
        `Continue executing ${state.planPath}. Remaining checklist items: ${progress.remaining}/${progress.total}. Work the next unchecked item now, update the plan checkboxes, verify, and continue until done.`,
        { deliverAs: "followUp" },
      );
    } catch {
      state.active = false;
      clearAbortKeys();
      updateExecutorStatus(ctx, false);
      ctx.ui.notify(`Could not read ${state.planPath}. Plan executor stopped.`, "error");
    }
  });

  pi.on("tool_result", async (event) => {
    if (!state.active) return;
    if (event.toolName === "write" || event.toolName === "edit") {
      state.idleTurns = 0;
    }
  });

  pi.on("session_start", async (_event, ctx) => {
    updateExecutorStatus(ctx, state.active);
    if (state.active) armAbortKeys(ctx);
  });
}
