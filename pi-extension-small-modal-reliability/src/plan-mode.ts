import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { TaskState } from "./types.ts";
import { taskDir } from "./paths.ts";
import { nowIso, readJsonFile, truncate, writeJsonFile } from "./utils.ts";

export type PlanModePhase = "explore" | "plan" | "implement" | "summarize" | "verify" | "report" | "complete" | "stopped";

export type PlanModeRun = {
  schema_version: 1;
  run_id: string;
  task_id: string;
  cwd: string;
  goal: string;
  enabled: boolean;
  phase: PlanModePhase;
  created_at: string;
  updated_at: string;
  iteration: number;
  max_iterations: number;
  artifacts: PlanModeArtifacts;
  last_issue?: string;
};

export type PlanModeArtifacts = {
  dir: string;
  state: string;
  exploration: string;
  plan: string;
  summary: string;
  verification: string;
  failuresDir: string;
  finalReport: string;
};

export type PlanModePointer = {
  enabled: boolean;
  armed: boolean;
  taskId?: string;
  runId?: string;
  updatedAt: string;
};

export type PlanModeProgress = {
  total: number;
  done: number;
  open: number;
  inProgress: number;
  finished: boolean;
  nextOpen?: string;
};

export const PLAN_MODE_CUSTOM_STATE_TYPE = "reliability-plan-mode-state";
export const PLAN_MODE_STATUS_KEY = "reliability-plan-mode";
export const PLAN_MODE_WIDGET_KEY = "reliability-plan-mode";

const MIN_ARTIFACT_CHARS = 80;

export function planModeArtifacts(cwd: string, taskId: string): PlanModeArtifacts {
  const dir = join(taskDir(cwd, taskId), "plan-mode");
  return {
    dir,
    state: join(dir, "plan-mode-state.json"),
    exploration: join(dir, "01-exploration.md"),
    plan: join(dir, "02-implementation-plan.md"),
    summary: join(dir, "03-summary.md"),
    verification: join(dir, "04-verification.md"),
    failuresDir: join(dir, "failures"),
    finalReport: join(dir, "05-final-report.md"),
  };
}

export function createPlanModeRun(state: TaskState): PlanModeRun {
  const artifacts = planModeArtifacts(state.cwd, state.task_id);
  mkdirSync(artifacts.failuresDir, { recursive: true });
  const now = nowIso();
  const run: PlanModeRun = {
    schema_version: 1,
    run_id: state.task_id,
    task_id: state.task_id,
    cwd: state.cwd,
    goal: state.normalized_goal || state.user_goal,
    enabled: true,
    phase: "explore",
    created_at: now,
    updated_at: now,
    iteration: 0,
    max_iterations: 50,
    artifacts,
  };
  ensurePlanModeTemplates(run);
  savePlanModeRun(run);
  return run;
}

export function loadPlanModeRun(cwd: string, taskId: string | undefined): PlanModeRun | undefined {
  if (!taskId) return undefined;
  const statePath = planModeArtifacts(cwd, taskId).state;
  const loaded = readJsonFile<PlanModeRun>(statePath);
  if (loaded?.schema_version !== 1) return undefined;
  return {
    ...loaded,
    artifacts: planModeArtifacts(cwd, taskId),
  };
}

export function savePlanModeRun(run: PlanModeRun): void {
  run.updated_at = nowIso();
  mkdirSync(run.artifacts.failuresDir, { recursive: true });
  writeJsonFile(run.artifacts.state, run);
}

export function planModePointer(run: PlanModeRun | undefined, armed: boolean): PlanModePointer {
  return {
    enabled: Boolean(run?.enabled || armed),
    armed,
    taskId: run?.task_id,
    runId: run?.run_id,
    updatedAt: nowIso(),
  };
}

export function persistPlanModePointer(pi: ExtensionAPI, run: PlanModeRun | undefined, armed: boolean): void {
  pi.appendEntry(PLAN_MODE_CUSTOM_STATE_TYPE, planModePointer(run, armed));
}

export function persistedPlanModePointerFromSession(ctx: ExtensionContext): PlanModePointer | undefined {
  const branch = ctx.sessionManager.getBranch() as Array<{ type?: string; customType?: string; data?: PlanModePointer }>;
  return branch
    .filter((entry) => entry.type === "custom" && entry.customType === PLAN_MODE_CUSTOM_STATE_TYPE)
    .map((entry) => entry.data)
    .filter((data): data is PlanModePointer => !!data && typeof data.enabled === "boolean")
    .at(-1);
}

export function readTextFile(filePath: string): string {
  try {
    if (!existsSync(filePath)) return "";
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function writeTextFile(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content.endsWith("\n") ? content : `${content}\n`, { encoding: "utf8", mode: 0o600 });
}

function ensureFile(filePath: string, content: string): void {
  if (!existsSync(filePath)) writeTextFile(filePath, content);
}

export function ensurePlanModeTemplates(run: PlanModeRun): void {
  mkdirSync(run.artifacts.failuresDir, { recursive: true });
  ensureFile(run.artifacts.exploration, [
    "# Plan Mode Exploration",
    "",
    `Run: ${run.run_id}`,
    `Goal: ${run.goal}`,
    "Status: TODO",
    "",
    "## Necessary information",
    "- TBD",
    "",
    "## Files, commands, and docs inspected",
    "- TBD",
    "",
    "## Decisions and constraints discovered",
    "- TBD",
    "",
    "## Risks, unknowns, and assumptions",
    "- TBD",
    "",
    "## Handoff to planning",
    "TBD",
  ].join("\n"));
  ensureFile(run.artifacts.plan, [
    "# Detailed Implementation Plan",
    "",
    `Run: ${run.run_id}`,
    `Goal: ${run.goal}`,
    "Status: TODO",
    "",
    "## Progress",
    "- [ ] Replace this placeholder with concrete implementation steps.",
    "",
    "## Step details",
    "TBD",
    "",
    "## Implementation log",
    "- TBD",
    "",
    "## Deviations",
    "- None yet.",
    "",
    "## Verification failures",
    "- None yet.",
  ].join("\n"));
  ensureFile(run.artifacts.summary, [
    "# Plan Mode Implementation Summary",
    "",
    `Run: ${run.run_id}`,
    `Goal: ${run.goal}`,
    "Status: TODO",
  ].join("\n"));
  ensureFile(run.artifacts.verification, [
    "# Plan Mode Verification",
    "",
    `Run: ${run.run_id}`,
    `Goal: ${run.goal}`,
    "Status: TODO",
  ].join("\n"));
  ensureFile(run.artifacts.finalReport, [
    "# Plan Mode Final Report",
    "",
    `Run: ${run.run_id}`,
    `Goal: ${run.goal}`,
    "Status: TODO",
  ].join("\n"));
}

export function artifactReady(filePath: string): boolean {
  const text = readTextFile(filePath).trim();
  if (text.length < MIN_ARTIFACT_CHARS) return false;
  return !/^Status:\s*TODO\s*$/im.test(text);
}

export function extractPlanModeProgress(planMarkdown: string): PlanModeProgress {
  const checkboxPattern = /^\s*-\s*\[([ xX\-])\]\s+(.+)$/gm;
  let total = 0;
  let done = 0;
  let open = 0;
  let inProgress = 0;
  let nextOpen: string | undefined;
  for (const match of planMarkdown.matchAll(checkboxPattern)) {
    total += 1;
    const marker = match[1];
    const text = match[2].trim();
    if (marker === "x" || marker === "X") {
      done += 1;
    } else if (marker === "-") {
      inProgress += 1;
      open += 1;
      nextOpen ??= text;
    } else {
      open += 1;
      nextOpen ??= text;
    }
  }
  return { total, done, open, inProgress, finished: total > 0 && open === 0, nextOpen };
}

export function listPlanModeFailureFiles(run: PlanModeRun): string[] {
  try {
    if (!existsSync(run.artifacts.failuresDir)) return [];
    return readdirSync(run.artifacts.failuresDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => join(run.artifacts.failuresDir, entry.name))
      .sort();
  } catch {
    return [];
  }
}

export function unresolvedPlanModeFailureFiles(run: PlanModeRun): string[] {
  return listPlanModeFailureFiles(run).filter((file) => !/^Status:\s*(RESOLVED|PASSED)\s*$/im.test(readTextFile(file)));
}

export function verificationLooksFailed(run: PlanModeRun): boolean {
  const verification = readTextFile(run.artifacts.verification);
  if (/^Status:\s*(FAILED|FAIL|BLOCKED)\s*$/im.test(verification)) return true;
  if (/\b(FAILED|FAILURE|BLOCKED|UNKNOWN)\b/i.test(verification) && !/^Status:\s*PASSED\s*$/im.test(verification)) return true;
  return unresolvedPlanModeFailureFiles(run).length > 0;
}

export function ensureGenericVerificationFailure(run: PlanModeRun, reason: string): string {
  const stamp = nowIso().replace(/[:.]/g, "-");
  const failurePath = join(run.artifacts.failuresDir, `failure-${stamp}.md`);
  writeTextFile(failurePath, [
    "# Verification Failure",
    "",
    "Status: OPEN",
    `Run: ${run.run_id}`,
    `Goal: ${run.goal}`,
    "",
    "## Failure",
    reason,
    "",
    "## Required remediation",
    "- Update the implementation plan with an open tracked item for this failure.",
    "- Fix the issue in a fresh implementation session.",
    "- Mark this file Status: RESOLVED only after verification evidence passes.",
  ].join("\n"));

  const plan = readTextFile(run.artifacts.plan);
  const progress = extractPlanModeProgress(plan);
  if (progress.finished) {
    writeTextFile(run.artifacts.plan, `${plan.trimEnd()}\n\n## Verification remediation\n- [ ] Remediate verification failure: ${truncate(reason, 120)}\n`);
  }
  return failurePath;
}

function promptArtifact(path: string, maxChars = 18000): string {
  const content = readTextFile(path);
  if (!content) return "(missing)";
  if (content.length <= maxChars) return content;
  return `${content.slice(0, maxChars)}\n\n[artifact truncated for context; read ${path} if needed]`;
}

function unresolvedFailuresForPrompt(run: PlanModeRun, maxChars = 12000): string {
  const failures = unresolvedPlanModeFailureFiles(run);
  if (failures.length === 0) return "No unresolved verification failure files.";
  return failures.map((file) => `## ${file}\n${promptArtifact(file, Math.floor(maxChars / Math.max(1, failures.length)))}`).join("\n\n");
}

function artifactList(run: PlanModeRun): string {
  return [
    `Exploration: ${run.artifacts.exploration}`,
    `Plan: ${run.artifacts.plan}`,
    `Summary: ${run.artifacts.summary}`,
    `Verification: ${run.artifacts.verification}`,
    `Failures directory: ${run.artifacts.failuresDir}`,
    `Final report: ${run.artifacts.finalReport}`,
  ].join("\n");
}

export function buildPlanModePhasePrompt(run: PlanModeRun): string {
  ensurePlanModeTemplates(run);
  const common = [
    "[RELIABILITY PLAN MODE]",
    "You are running a single-model plan workflow. Do not use subagents.",
    "Each phase intentionally starts in a fresh session; use only the files below as durable context.",
    "Do not rely on prior chat history. Update the required Markdown artifact before finishing this turn.",
    "Every implementation deviation from the plan must be documented in the plan file under ## Deviations.",
    "Do not claim completion unless the relevant Markdown artifact status/progress supports it.",
    "",
    `Run: ${run.run_id}`,
    `Goal: ${run.goal}`,
    ...(run.last_issue ? [`Last orchestration issue: ${run.last_issue}`] : []),
    "Artifacts:",
    artifactList(run),
    "[/RELIABILITY PLAN MODE]",
  ].join("\n");

  if (run.phase === "explore") {
    return `${common}\n\nPhase: EXPLORE.\n\nExtract only the information necessary to solve the goal. Explore the repository/docs/config with read-only intent first. Save the handoff to:\n${run.artifacts.exploration}\n\nRequired file shape:\n- Set \`Status: COMPLETE\`.\n- Include necessary facts, inspected files/commands, discovered constraints, unknowns, and a concise handoff to planning.\n- Do not implement changes in this phase unless the user goal is purely documentation-free analysis.`;
  }

  if (run.phase === "plan") {
    return `${common}\n\nPhase: PLAN.\n\nUse the exploration handoff below to create a detailed step-by-step implementation plan.\n\nExploration artifact (${run.artifacts.exploration}):\n\n${promptArtifact(run.artifacts.exploration)}\n\nWrite the detailed plan to:\n${run.artifacts.plan}\n\nPlan requirements:\n- Set \`Status: IN_PROGRESS\`.\n- Under \`## Progress\`, create concrete checklist items with \`- [ ]\` markers.\n- Include enough implementation detail that a fresh session can execute one checklist item at a time.\n- Include \`## Implementation log\`, \`## Deviations\`, and \`## Verification failures\` sections.\n- Document how each item should be verified.`;
  }

  if (run.phase === "implement") {
    const plan = promptArtifact(run.artifacts.plan);
    const progress = extractPlanModeProgress(readTextFile(run.artifacts.plan));
    const next = progress.nextOpen ? `First open tracked item: ${progress.nextOpen}` : "No open tracked item could be parsed; repair the plan file first.";
    return `${common}\n\nPhase: IMPLEMENT ONE STEP.\n\n${next}\n\nDetailed plan (${run.artifacts.plan}):\n\n${plan}\n\nUnresolved verification failure files:\n\n${unresolvedFailuresForPrompt(run)}\n\nInstructions:\n- Implement exactly the first open tracked item (or the highest-priority unresolved failure if one exists).\n- Update ${run.artifacts.plan}: mark the item \`[-]\` while working if useful, then \`[x]\` only when the step is actually complete.\n- Add an entry under \`## Implementation log\` with files changed, commands run, and evidence.\n- If you deviate from the plan, append the deviation and reason under \`## Deviations\`.\n- If a failure file is resolved, set its \`Status: RESOLVED\` and cite evidence.\n- Stop after this one step; the extension will clear context and launch the next step.`;
  }

  if (run.phase === "summarize") {
    return `${common}\n\nPhase: SUMMARY.\n\nThe implementation plan shows no open tracked checklist items. Create a concise implementation summary based only on the finished plan file.\n\nPlan artifact (${run.artifacts.plan}):\n\n${promptArtifact(run.artifacts.plan)}\n\nWrite the summary to:\n${run.artifacts.summary}\n\nSummary requirements:\n- Set \`Status: COMPLETE\`.\n- Include goal, implemented changes, files changed, deviations, commands/checks already run, and remaining verification needs.\n- Do not modify implementation files in this phase.`;
  }

  if (run.phase === "verify") {
    return `${common}\n\nPhase: VERIFY.\n\nVerify the implementation based on the summary file in a fresh context.\n\nSummary artifact (${run.artifacts.summary}):\n\n${promptArtifact(run.artifacts.summary)}\n\nPlan artifact (${run.artifacts.plan}):\n\n${promptArtifact(run.artifacts.plan, 12000)}\n\nWrite verification results to:\n${run.artifacts.verification}\n\nVerification requirements:\n- Run or inspect whatever is necessary to verify the summary.\n- Set \`Status: PASSED\` only if all relevant checks pass. Set \`Status: FAILED\` if any check fails or required evidence is missing.\n- For each failure, create a separate Markdown file in ${run.artifacts.failuresDir} with \`Status: OPEN\`, failure evidence, suspected affected plan item, and remediation instructions.\n- If verification fails, update ${run.artifacts.plan} so related progress is not fully done: add or reopen a \`- [ ]\` tracked item for the failure under progress or verification remediation.\n- Do not report final success to the user from this phase.`;
  }

  if (run.phase === "report") {
    return `${common}\n\nPhase: FINAL REPORT.\n\nVerification passed and no unresolved failure files remain. Create a final report Markdown file, then report to the user.\n\nSummary artifact (${run.artifacts.summary}):\n\n${promptArtifact(run.artifacts.summary)}\n\nVerification artifact (${run.artifacts.verification}):\n\n${promptArtifact(run.artifacts.verification)}\n\nWrite final report to:\n${run.artifacts.finalReport}\n\nFinal response requirements:\n- Set the final report file \`Status: COMPLETE\`.\n- Tell the user what changed, what was verified, where the artifacts are, and any remaining risks.\n- Be concise and grounded in the artifacts.`;
  }

  return `${common}\n\nPlan mode is ${run.phase}. No model action is required.`;
}

export function nextPlanModePhaseAfterAgent(run: PlanModeRun): { phase: PlanModePhase; issue?: string; complete?: boolean } {
  ensurePlanModeTemplates(run);
  if (run.phase === "explore") {
    if (!artifactReady(run.artifacts.exploration)) return { phase: "explore", issue: "Exploration artifact is missing or still marked TODO." };
    return { phase: "plan" };
  }
  if (run.phase === "plan") {
    const progress = extractPlanModeProgress(readTextFile(run.artifacts.plan));
    if (!artifactReady(run.artifacts.plan) || progress.total === 0) return { phase: "plan", issue: "Implementation plan is missing concrete checklist progress." };
    return { phase: "implement" };
  }
  if (run.phase === "implement") {
    const progress = extractPlanModeProgress(readTextFile(run.artifacts.plan));
    if (progress.finished) return { phase: "summarize" };
    return { phase: "implement" };
  }
  if (run.phase === "summarize") {
    if (!artifactReady(run.artifacts.summary)) return { phase: "summarize", issue: "Summary artifact is missing or still marked TODO." };
    return { phase: "verify" };
  }
  if (run.phase === "verify") {
    if (!artifactReady(run.artifacts.verification)) return { phase: "verify", issue: "Verification artifact is missing or still marked TODO." };
    if (verificationLooksFailed(run)) {
      const failures = unresolvedPlanModeFailureFiles(run);
      if (failures.length === 0) {
        ensureGenericVerificationFailure(run, "Verification artifact indicates failure or unknown evidence, but no failure file was created.");
      }
      return { phase: "implement", issue: "Verification failed; returning to implementation for remediation." };
    }
    return { phase: "report" };
  }
  if (run.phase === "report") {
    if (!artifactReady(run.artifacts.finalReport)) return { phase: "report", issue: "Final report artifact is missing or still marked TODO." };
    return { phase: "complete", complete: true };
  }
  return { phase: run.phase, complete: run.phase === "complete" };
}

export function formatPlanModeStatus(run: PlanModeRun | undefined, armed = false): string {
  if (!run) return armed ? "Reliability plan mode: armed for the next user task." : "Reliability plan mode: off.";
  const progress = extractPlanModeProgress(readTextFile(run.artifacts.plan));
  const failures = unresolvedPlanModeFailureFiles(run).length;
  return [
    `Reliability plan mode: ${run.enabled ? "on" : "off"}`,
    `Run: ${run.run_id}`,
    `Goal: ${run.goal}`,
    `Phase: ${run.phase}`,
    `Plan progress: ${progress.done}/${progress.total} done, ${progress.open} open`,
    `Unresolved failures: ${failures}`,
    "Artifacts:",
    artifactList(run),
  ].join("\n");
}

export function updatePlanModeUi(ctx: ExtensionContext, run: PlanModeRun | undefined, armed = false): void {
  if (!run && !armed) {
    ctx.ui.setStatus(PLAN_MODE_STATUS_KEY, undefined);
    ctx.ui.setWidget(PLAN_MODE_WIDGET_KEY, undefined);
    return;
  }
  if (!run) {
    ctx.ui.setStatus(PLAN_MODE_STATUS_KEY, ctx.ui.theme.fg("muted", "Plan armed"));
    ctx.ui.setWidget(PLAN_MODE_WIDGET_KEY, [ctx.ui.theme.fg("dim", "Reliability plan mode armed for next task")]);
    return;
  }
  const progress = extractPlanModeProgress(readTextFile(run.artifacts.plan));
  const failures = unresolvedPlanModeFailureFiles(run).length;
  ctx.ui.setStatus(PLAN_MODE_STATUS_KEY, ctx.ui.theme.fg(failures ? "warning" : "accent", `Plan ${run.phase} ${progress.done}/${progress.total}`));
  ctx.ui.setWidget(PLAN_MODE_WIDGET_KEY, [
    ctx.ui.theme.bold(`Plan mode: ${run.phase}`),
    `Goal: ${truncate(run.goal, 90)}`,
    `Progress: ${progress.done}/${progress.total} done, ${progress.open} open`,
    `Failures: ${failures}`,
    `Plan: ${run.artifacts.plan}`,
  ]);
}
