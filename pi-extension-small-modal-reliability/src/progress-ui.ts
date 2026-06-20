import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { ReliabilityConfig, TaskState } from "./types.ts";
import { STATUS_KEY, WIDGET_KEY } from "./types.ts";
import { scratchpadPathFor } from "./paths.ts";
import { getStep, planProgress } from "./planner.ts";
import { truncate } from "./utils.ts";
import { computeVerification } from "./verification-state.ts";

export function formatStatus(state: TaskState | undefined, enabled: boolean, config?: ReliabilityConfig): string {
  const profileLine = config ? `Profile: ${config.profile} (repeat limit ${config.maxRepeatedAction}, context ${config.contextMode}, raw logs ${config.storeRawToolLogs ? "on" : "off"}, orchestration ${config.orchestrationMode}, require verification ${config.requireVerification ? "yes" : "no"})` : undefined;
  if (!enabled) return ["Reliability harness: OFF", profileLine].filter(Boolean).join("\n");
  if (!state) return ["Reliability harness: ON, waiting for the next task.", profileLine].filter(Boolean).join("\n");
  const progress = planProgress(state);
  const current = getStep(state, state.current_step_id);
  return [
    "Reliability harness: ON",
    profileLine,
    `Task: ${state.task_id}`,
    `Goal: ${state.normalized_goal}`,
    `Status: ${state.status}`,
    `Current step: ${current ? `${current.step_id} ${current.title} (${current.status})` : "none"}`,
    `Plan progress: ${progress.done}/${progress.total}`,
    `Scratchpad: ${scratchpadPathFor(state.cwd, state.task_id)}`,
  ].filter(Boolean).join("\n");
}

export function updateUi(ctx: ExtensionContext, enabled: boolean, state: TaskState | undefined, config: ReliabilityConfig): void {
  if (!enabled) {
    ctx.ui.setStatus(STATUS_KEY, undefined);
    ctx.ui.setWidget(WIDGET_KEY, undefined);
    return;
  }
  if (!state) {
    ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("muted", "Rel"));
    ctx.ui.setWidget(WIDGET_KEY, config.progressWidget ? [ctx.ui.theme.fg("dim", "Reliability harness armed for next task")] : undefined);
    return;
  }
  const verification = computeVerification(state);
  const unknown = verification.some((item) => item.status !== "passed");
  const progress = planProgress(state);
  ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg(unknown ? "warning" : "accent", `Rel ${progress.done}/${progress.total}`));
  ctx.ui.setWidget(WIDGET_KEY, config.progressWidget ? [
    ctx.ui.theme.bold(`Reliability: ${state.status} (${config.profile}, ${config.contextMode})`),
    `Goal: ${truncate(state.normalized_goal, 90)}`,
    `Current: ${state.current_step_id} — ${getStep(state, state.current_step_id)?.title ?? "none"}`,
    `Verify: ${verification.filter((item) => item.status === "passed").length}/${verification.length} passed`,
  ] : undefined);
}
