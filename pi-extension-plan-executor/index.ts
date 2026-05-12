import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type PlanRuntimeState = {
  active: boolean;
  planPath: string;
  maxIdleTurns: number;
  idleTurns: number;
};

const DEFAULT_PATH = "PLAN.md";
const EXECUTOR_STATUS_KEY = "plan-executor";

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
    maxIdleTurns: 3,
    idleTurns: 0,
  };

  pi.registerCommand("execute-plan", {
    description: "Execute PLAN.md until all checklist items are completed",
    handler: async (args, ctx) => {
      const planPath = (args || DEFAULT_PATH).trim();
      state.active = true;
      state.planPath = planPath || DEFAULT_PATH;
      state.idleTurns = 0;

      pi.sendUserMessage(
        `Start autonomous plan execution for ${state.planPath}. Keep working until every markdown checklist item is checked. After each implementation step, update ${state.planPath}, run relevant verification, and continue to the next unchecked item until complete.`,
      );

      updateExecutorStatus(ctx, true);
      ctx.ui.notify(`Plan executor started: ${state.planPath}`, "success");
    },
  });

  pi.registerCommand("stop-plan", {
    description: "Stop active PLAN executor loop",
    handler: async (_args, ctx) => {
      state.active = false;
      updateExecutorStatus(ctx, false);
      ctx.ui.notify("Plan executor stopped", "info");
    },
  });

  pi.registerCommand("plan-status", {
    description: "Show current PLAN executor status",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        `active=${state.active} plan=${state.planPath} idleTurns=${state.idleTurns}/${state.maxIdleTurns}`,
        "info",
      );
    },
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (!state.active) return;

    try {
      const plan = await readFile(resolve(ctx.cwd, state.planPath), "utf8");
      const progress = parsePlanProgress(plan);

      if (progress.total === 0) {
        state.active = false;
        updateExecutorStatus(ctx, false);
        ctx.ui.notify(`No checklist items found in ${state.planPath}. Stopping executor.`, "warning");
        return;
      }

      if (progress.remaining === 0) {
        state.active = false;
        updateExecutorStatus(ctx, false);
        ctx.ui.notify(`Plan completed: ${state.planPath} (${progress.done}/${progress.total})`, "success");
        return;
      }

      state.idleTurns += 1;
      if (state.idleTurns > state.maxIdleTurns) {
        state.active = false;
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
  });
}
