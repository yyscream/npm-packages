import type { PlanStep, StepStatus, TaskState } from "./types.ts";
import { addUniqueBounded, firstLines, truncate } from "./utils.ts";

export function normalizeGoal(prompt: string): string {
  const lines = firstLines(prompt, 5);
  return truncate(lines.join(" ") || prompt, 500);
}

export function extractSuccessCriteria(prompt: string): string[] {
  const lines = firstLines(prompt, 12);
  const explicit = lines
    .filter((line) => /\b(must|should|need|needs|acceptance|verify|test|ensure|require|required)\b/i.test(line))
    .map((line) => truncate(line.replace(/^[-*\d.)\s]+/, ""), 220));

  const criteria = explicit.length > 0 ? explicit : [
    "The original user goal is addressed.",
    "Important changes are verified with evidence, or unverifiable parts are explicitly disclosed.",
    "The final response summarizes what changed, verification performed, and remaining risks.",
  ];

  return [...new Set(criteria)].slice(0, 8);
}

export function extractConstraints(prompt: string): string[] {
  const constraints = firstLines(prompt, 20)
    .filter((line) => /\b(do not|don't|must not|avoid|only|prefer|without|keep|preserve|ask first|destructive|secret|private)\b/i.test(line))
    .map((line) => truncate(line.replace(/^[-*\d.)\s]+/, ""), 220));
  return [...new Set(constraints)].slice(0, 8);
}

export function createInitialPlan(successCriteria: string[]): PlanStep[] {
  return [
    {
      step_id: "S1",
      title: "Ground the task",
      description: "Restate the goal, inspect only the context needed, and identify concrete success criteria.",
      status: "pending",
      depends_on: [],
      expected_output: "Known facts and a focused next action.",
      verification: "Relevant context or files are identified without drifting from the goal.",
    },
    {
      step_id: "S2",
      title: "Execute the requested work",
      description: "Make the smallest safe changes or produce the requested answer while staying inside constraints.",
      status: "pending",
      depends_on: ["S1"],
      expected_output: "Requested implementation, answer, or artifact.",
      verification: "Changed files or produced artifacts are recorded in task state.",
    },
    {
      step_id: "S3",
      title: "Verify success criteria",
      description: "Check each success criterion using tests, commands, file review, or explicit evidence.",
      status: "pending",
      depends_on: ["S2"],
      expected_output: "Verification evidence for every criterion.",
      verification: successCriteria.map((criterion) => `Criterion: ${criterion}`).join(" "),
    },
    {
      step_id: "S4",
      title: "Report outcome",
      description: "Give the user a concise final response with changes, verification, and any remaining risks.",
      status: "pending",
      depends_on: ["S3"],
      expected_output: "Final answer grounded in state evidence.",
      verification: "Final response discloses failed or unknown criteria instead of claiming unsupported completion.",
    },
  ];
}

export function getStep(state: TaskState, stepId: string | undefined): PlanStep | undefined {
  if (!stepId) return undefined;
  return state.plan.find((step) => step.step_id === stepId);
}

export function isStepComplete(state: TaskState, stepId: string): boolean {
  return getStep(state, stepId)?.status === "complete";
}

export function dependenciesSatisfied(state: TaskState, step: PlanStep): boolean {
  return step.depends_on.every((dep) => isStepComplete(state, dep));
}

export function selectNextStep(state: TaskState): PlanStep | undefined {
  const current = getStep(state, state.current_step_id);
  if (current && current.status === "in_progress") return current;

  const pending = state.plan.find((step) => step.status === "pending" && dependenciesSatisfied(state, step));
  if (pending) {
    pending.status = "in_progress";
    state.current_step_id = pending.step_id;
    state.current_phase = pending.title;
    return pending;
  }

  const blocked = state.plan.find((step) => step.status === "blocked");
  if (blocked) {
    state.current_step_id = blocked.step_id;
    state.current_phase = blocked.title;
    return blocked;
  }

  return current;
}

export function setStepStatus(state: TaskState, stepId: string | undefined, status: StepStatus): void {
  const step = getStep(state, stepId);
  if (!step) return;
  step.status = status;
  if (status === "complete") addUniqueBounded(state.completed_steps, step.step_id, 100);
  if (status === "blocked") addUniqueBounded(state.blocked_steps, step.step_id, 100);
}

export function planProgress(state: TaskState): { done: number; total: number } {
  return {
    done: state.plan.filter((step) => step.status === "complete" || step.status === "skipped").length,
    total: state.plan.length,
  };
}

export function replacePlan(state: TaskState, proposedSteps: Array<Record<string, unknown>>, replace: boolean): void {
  const existingById = new Map(state.plan.map((step) => [step.step_id, step]));
  const existingByTitle = new Map(state.plan.map((step) => [step.title.toLowerCase(), step]));
  const nextSteps = proposedSteps.slice(0, 16).map((raw, index): PlanStep => {
    const title = truncate(String(raw.title ?? `Step ${index + 1}`), 120);
    const requestedId = typeof raw.step_id === "string" && raw.step_id.trim() ? raw.step_id.trim() : `S${index + 1}`;
    const previous = existingById.get(requestedId) ?? existingByTitle.get(title.toLowerCase());
    const rawStatus = typeof raw.status === "string" ? raw.status as StepStatus : undefined;
    const status: StepStatus = rawStatus && ["pending", "in_progress", "complete", "blocked", "skipped"].includes(rawStatus) ? rawStatus : previous?.status ?? "pending";
    return {
      step_id: requestedId,
      title,
      description: truncate(String(raw.description ?? title), 300),
      status,
      depends_on: Array.isArray(raw.depends_on) ? raw.depends_on.filter((item): item is string => typeof item === "string").slice(0, 8) : index > 0 ? [`S${index}`] : [],
      expected_output: truncate(String(raw.expected_output ?? "Concrete progress toward the goal."), 220),
      verification: truncate(String(raw.verification ?? "Evidence is recorded in task state."), 300),
    };
  });
  if (replace) state.plan = nextSteps;
  else state.plan = [...state.plan, ...nextSteps.filter((step) => !state.plan.some((existing) => existing.step_id === step.step_id))];
  if (!getStep(state, state.current_step_id)) state.current_step_id = state.plan[0]?.step_id ?? "";
}
