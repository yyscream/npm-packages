import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { TaskState } from "./types.ts";
import { scratchpadPathFor } from "./paths.ts";
import { getStep, planProgress } from "./planner.ts";
import { computeVerification } from "./verification-state.ts";

export function writeScratchpad(state: TaskState): void {
  const path = scratchpadPathFor(state.cwd, state.task_id);
  mkdirSync(dirname(path), { recursive: true });
  const current = getStep(state, state.current_step_id);
  const progress = planProgress(state);
  const verification = computeVerification(state);
  const lines = [
    "# Task Scratchpad",
    "",
    `Task ID: ${state.task_id}`,
    `Updated: ${state.updated_at}`,
    `Status: ${state.status}`,
    `Goal: ${state.normalized_goal}`,
    `Current step: ${current ? `${current.step_id} — ${current.title} (${current.status})` : "none"}`,
    `Plan progress: ${progress.done}/${progress.total}`,
    "",
    "## Plan",
    ...state.plan.map((step) => `- [${step.status === "complete" ? "x" : step.status === "in_progress" ? "-" : " "}] ${step.step_id}: ${step.title} — ${step.verification}`),
    "",
    "## Known facts",
    ...(state.known_facts.length ? state.known_facts.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Verification",
    ...verification.map((item) => `- ${item.status.toUpperCase()}: ${item.criterion} — ${item.evidence}`),
    "",
    "## Next action",
    state.next_action || "Continue current step.",
  ];
  writeFileSync(path, `${lines.join("\n")}\n`, { encoding: "utf8", mode: 0o600 });
}
