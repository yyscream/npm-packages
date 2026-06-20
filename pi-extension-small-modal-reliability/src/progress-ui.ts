import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { ReliabilityConfig, TaskState } from "./types.ts";
import { STATUS_KEY, WIDGET_KEY } from "./types.ts";
import { scratchpadPathFor } from "./paths.ts";
import { getStep, planProgress } from "./planner.ts";
import { truncate } from "./utils.ts";
import { computeVerification } from "./verification-state.ts";

export function formatStatus(state: TaskState | undefined, enabled: boolean, config?: ReliabilityConfig): string {
  const profileLine = config ? `Profile: ${config.profile} (mode ${config.supervisionMode}, repeat limit ${config.maxRepeatedAction}, context ${config.contextMode}, raw logs ${config.storeRawToolLogs ? "on" : "off"}, orchestration ${config.orchestrationMode}, require verification ${config.requireVerification ? "yes" : "no"})` : undefined;
  if (!enabled) return ["Reliability harness: OFF", profileLine].filter(Boolean).join("\n");
  if (!state) return ["Reliability harness: ON, waiting for the next task.", profileLine].filter(Boolean).join("\n");
  const progress = planProgress(state);
  const current = getStep(state, state.current_step_id);
  const lines = [
    "Reliability harness: ON",
    profileLine,
    `Task: ${state.task_id}`,
    `Goal: ${state.normalized_goal}`,
    `Status: ${state.status}`,
  ];
  if (config?.supervisionMode === "lite") {
    lines.push(`Plan progress: ${progress.done}/${progress.total} (lite mode; supervisor steps hidden)`);
  } else {
    lines.push(`Current step: ${current ? `${current.step_id} ${current.title} (${current.status})` : "none"}`);
    lines.push(`Plan progress: ${progress.done}/${progress.total}`);
  }
  lines.push(`Scratchpad: ${scratchpadPathFor(state.cwd, state.task_id)}`);
  return lines.filter(Boolean).join("\n");
}

type ReliabilityUiState = {
  statusText: string | undefined;
  statusColor?: string;
  widgetLines?: string[];
};

function setReliabilityUi(ctx: ExtensionContext, config: ReliabilityConfig, uiState: ReliabilityUiState): void {
  ctx.ui.setStatus(STATUS_KEY, uiState.statusText ? ctx.ui.theme.fg(uiState.statusColor ?? "accent", uiState.statusText) : undefined);
  ctx.ui.setWidget(WIDGET_KEY, config.progressWidget ? uiState.widgetLines : undefined);
}

function buildActiveUiState(ctx: ExtensionContext, state: TaskState, config: ReliabilityConfig): ReliabilityUiState {
  const verification = computeVerification(state);
  const hasUnpassedVerification = verification.some((item) => item.status !== "passed");
  const passedVerificationCount = verification.filter((item) => item.status === "passed").length;
  const progress = planProgress(state);
  const statusText = config.supervisionMode === "lite" ? "Rel lite" : `Rel ${progress.done}/${progress.total}`;
  const widgetLines = [
    ctx.ui.theme.bold(`Reliability: ${state.status} (${config.profile}, ${config.supervisionMode}, ${config.contextMode})`),
    `Goal: ${truncate(state.normalized_goal, 90)}`,
  ];

  if (config.supervisionMode !== "lite") {
    const currentStep = getStep(state, state.current_step_id);
    widgetLines.push(`Current: ${state.current_step_id} — ${currentStep?.title ?? "none"}`);
  }

  widgetLines.push(`Verify: ${passedVerificationCount}/${verification.length} passed`);
  return { statusText, statusColor: hasUnpassedVerification ? "warning" : "accent", widgetLines };
}

export function updateUi(ctx: ExtensionContext, enabled: boolean, state: TaskState | undefined, config: ReliabilityConfig): void {
  if (!enabled) {
    setReliabilityUi(ctx, config, { statusText: undefined });
    return;
  }

  if (!state) {
    setReliabilityUi(ctx, config, {
      statusText: "Rel",
      statusColor: "muted",
      widgetLines: [ctx.ui.theme.fg("dim", "Reliability harness armed for next task")],
    });
    return;
  }

  setReliabilityUi(ctx, config, buildActiveUiState(ctx, state, config));
}
