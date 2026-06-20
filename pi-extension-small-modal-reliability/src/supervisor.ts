import type { PlanStep, ReliabilityConfig, StepStatus, TaskState } from "./core.ts";
import { addUniqueBounded, getStep, pushBounded, selectNextStep, setStepStatus, truncate } from "./core.ts";

export type SupervisorDecision = {
  step_id: string;
  step_title: string;
  step_status: StepStatus;
  worker_goal: string;
  expected_output: string;
  verification_required: boolean;
  constraints: string[];
  next_action: string;
};

export type WorkerResultStatus = "complete" | "blocked" | "failed";

export type WorkerResultInput = {
  step_id: string;
  action_taken: string;
  result: string;
  files_changed?: string[];
  errors?: string[];
  next_recommendation?: string;
  status: WorkerResultStatus;
};

function fallbackStep(state: TaskState): PlanStep {
  return {
    step_id: state.current_step_id || "S1",
    title: state.current_phase || "Continue task",
    description: state.next_action || "Continue the current reliability task.",
    status: "in_progress",
    depends_on: [],
    expected_output: "Progress toward the user goal.",
    verification: "Progress is recorded in task state.",
  };
}

export function buildSupervisorDecision(state: TaskState, config: ReliabilityConfig): SupervisorDecision {
  const step = selectNextStep(state) ?? getStep(state, state.current_step_id) ?? fallbackStep(state);
  return {
    step_id: step.step_id,
    step_title: step.title,
    step_status: step.status,
    worker_goal: step.description,
    expected_output: step.expected_output,
    verification_required: config.requireVerification,
    constraints: state.constraints.slice(0, 8),
    next_action: state.next_action || step.description,
  };
}

export function buildWorkerContractPrompt(decision: SupervisorDecision): string {
  return [
    "[SUPERVISOR / WORKER SPLIT]",
    "The harness supervisor owns task state, step selection, loop control, and verification gating.",
    "You are the worker for exactly one focused step. Stay inside the current step unless the supervisor state is revised.",
    "",
    `Worker step: ${decision.step_id} — ${decision.step_title} (${decision.step_status})`,
    `Worker goal: ${decision.worker_goal}`,
    `Expected output: ${decision.expected_output}`,
    `Verification required: ${decision.verification_required ? "yes" : "no"}`,
    decision.verification_required ? "Verification rule: before completing verification/reporting work or making a final completion claim, call reliability_verify_completion with explicit PASSED/FAILED/UNKNOWN evidence for each criterion." : undefined,
    decision.constraints.length ? `Constraints: ${decision.constraints.join("; ")}` : "Constraints: stay on the user's task and avoid unrelated work.",
    `Next action: ${decision.next_action}`,
    "",
    "When this step is complete, blocked, or failed, call reliability_submit_worker_result with the worker contract fields.",
    "[/SUPERVISOR / WORKER SPLIT]",
  ].filter((line): line is string => typeof line === "string").join("\n");
}

export function applyWorkerResult(state: TaskState, result: WorkerResultInput): void {
  const status: StepStatus = result.status === "complete" ? "complete" : "blocked";
  setStepStatus(state, result.step_id, status);
  addUniqueBounded(state.known_facts, `Worker ${result.status} ${result.step_id}: ${truncate(result.result, 240)}`, 40);
  addUniqueBounded(state.decisions, result.action_taken ? `Worker action ${result.step_id}: ${truncate(result.action_taken, 240)}` : undefined, 40);
  for (const file of result.files_changed ?? []) addUniqueBounded(state.files_touched, file, 120);
  for (const error of result.errors ?? []) pushBounded(state.errors, `${result.step_id}: ${truncate(error, 240)}`, 30);
  if (result.next_recommendation) state.next_action = truncate(result.next_recommendation, 300);
  if (result.status === "failed") state.status = "failed";
  else if (result.status === "blocked") state.status = "blocked";
  else state.status = "executing";
}
