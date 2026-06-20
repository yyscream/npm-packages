import type { ContextHeaderResult, ContextSnapshot, ReliabilityConfig, TaskState } from "./types.ts";
import { scratchpadPathFor } from "./paths.ts";
import { getStep } from "./planner.ts";
import { computeVerification } from "./verification-state.ts";

export function createContextSnapshot(state: TaskState): ContextSnapshot {
  const verification = computeVerification(state);
  return {
    goal: state.normalized_goal,
    currentStepId: state.current_step_id,
    planStatuses: state.plan.map((step) => `${step.step_id}:${step.status}`).join(","),
    completedSteps: state.completed_steps.join(","),
    blockedSteps: state.blocked_steps.join(","),
    latestFacts: state.known_facts.slice(-5).join(" | "),
    latestErrors: state.errors.slice(-5).join(" | "),
    latestWarnings: state.loop_warnings.slice(-5).join(" | "),
    verificationStatuses: verification.map((item) => `${item.status}:${item.criterion}`).join(" | "),
    nextAction: state.next_action,
    filesTouched: state.files_touched.slice(-10).join(","),
  };
}

function snapshotDiff(previous: ContextSnapshot | undefined, next: ContextSnapshot): string[] {
  if (!previous) return ["Initial context snapshot."];
  const lines: string[] = [];
  for (const key of Object.keys(next) as Array<keyof ContextSnapshot>) {
    if (previous[key] !== next[key]) lines.push(`${key}: ${previous[key] || "(empty)"} -> ${next[key] || "(empty)"}`);
  }
  return lines.length ? lines : ["No material reliability-state changes since the previous context header."];
}

function compactPlan(state: TaskState): string[] {
  return state.plan.map((step) => `${step.step_id}:${step.status}:${step.title}`);
}

function truncateHeader(header: string, state: TaskState, config: ReliabilityConfig): string {
  if (header.length <= config.contextBudgetChars) return header;
  return `${header.slice(0, config.contextBudgetChars - 120)}\n… [reliability header truncated to budget; inspect ${scratchpadPathFor(state.cwd, state.task_id)} if needed]\n[/RELIABILITY HARNESS ACTIVE]`;
}

export function buildContextHeader(state: TaskState, config: ReliabilityConfig, previous?: ContextSnapshot): ContextHeaderResult {
  const snapshot = createContextSnapshot(state);
  const current = getStep(state, state.current_step_id);
  const verification = computeVerification(state);
  const lines = [
    "[RELIABILITY HARNESS ACTIVE]",
    `Header mode: ${config.contextMode}`,
    `Task: ${state.task_id}`,
    `Goal: ${state.normalized_goal}`,
    `Status: ${state.status}`,
    `Current step: ${current ? `${current.step_id} — ${current.title} (${current.status})` : "none"}`,
  ];

  if (config.contextMode === "delta") {
    lines.push("Delta:", ...snapshotDiff(previous, snapshot).map((item) => `- ${item}`));
    lines.push(`Next action: ${state.next_action}`);
  } else if (config.contextMode === "compact") {
    lines.push("Plan:", ...compactPlan(state).map((item) => `- ${item}`));
    lines.push("Recent facts:", ...state.known_facts.slice(-5).map((item) => `- ${item}`));
    lines.push("Verification:", ...verification.map((item) => `- ${item.status.toUpperCase()}: ${item.criterion}`));
    lines.push(`Next action: ${state.next_action}`);
  } else {
    lines.push(
      "Plan:",
      ...state.plan.map((step) => `- ${step.step_id} [${step.status}] ${step.title}: ${step.description} Verification: ${step.verification}`),
      "Success criteria:",
      ...state.success_criteria.map((item) => `- ${item}`),
      "Constraints:",
      ...(state.constraints.length ? state.constraints.map((item) => `- ${item}`) : ["- none"]),
      "Known facts:",
      ...(state.known_facts.length ? state.known_facts.map((item) => `- ${item}`) : ["- none"]),
      "Errors:",
      ...(state.errors.length ? state.errors.slice(-10).map((item) => `- ${item}`) : ["- none"]),
      "Verification:",
      ...verification.map((item) => `- ${item.status.toUpperCase()}: ${item.criterion} — ${item.evidence}`),
      `Scratchpad: ${scratchpadPathFor(state.cwd, state.task_id)}`,
      `Next action: ${state.next_action}`,
    );
  }
  lines.push("[/RELIABILITY HARNESS ACTIVE]");
  return { header: truncateHeader(lines.join("\n"), state, config), snapshot };
}
