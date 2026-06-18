import { appendFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { CONFIG_DIR_NAME, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { PersistedExtensionState, ReliabilityConfig, TaskState, TaskSummary } from "./types.ts";
import { CUSTOM_STATE_TYPE, DEFAULT_CONFIG } from "./types.ts";
import { archivedMarkerPath, latestPointerPath, statePathFor, taskDir, taskRoot } from "./paths.ts";
import { createInitialPlan, extractConstraints, extractSuccessCriteria, normalizeGoal, planProgress } from "./planner.ts";
import { writeScratchpad } from "./scratchpad.ts";
import { nowIso, readJsonFile, truncate, writeJsonFile } from "./utils.ts";

let scratchpadWritesEnabled = DEFAULT_CONFIG.scratchpadEnabled;

export function setScratchpadWritesEnabled(enabled: boolean): void {
  scratchpadWritesEnabled = enabled;
}

export function createTaskState(cwd: string, prompt: string, sessionFile: string | undefined, config: ReliabilityConfig): TaskState {
  const created = nowIso();
  const successCriteria = extractSuccessCriteria(prompt);
  return {
    schema_version: 1,
    task_id: randomUUID(),
    created_at: created,
    updated_at: created,
    cwd,
    session_file: sessionFile,
    status: "planning",
    user_goal: prompt,
    normalized_goal: normalizeGoal(prompt),
    success_criteria: successCriteria,
    constraints: extractConstraints(prompt),
    current_phase: "planning",
    current_step_id: "S1",
    plan: createInitialPlan(successCriteria),
    completed_steps: [],
    blocked_steps: [],
    known_facts: [],
    open_questions: [],
    decisions: [],
    tool_history: [],
    files_touched: [],
    read_files: [],
    modified_files: [],
    errors: [],
    loop_warnings: [],
    verification: [],
    next_action: "Follow the current plan step and gather only necessary context.",
    final_answer_requirements: [
      "State what changed or was concluded.",
      "List verification evidence, commands, or checks performed.",
      "Disclose failed or unknown success criteria and remaining risks.",
    ],
    counters: {
      context_injections: 0,
      model_responses: 0,
      tool_calls: 0,
      repeated_action_limit: config.maxRepeatedAction,
    },
  };
}

export function changedTopLevelKeys(previous: TaskState | undefined, next: TaskState): string[] {
  if (!previous) return ["created"];
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const changed: string[] = [];
  for (const key of keys) {
    const before = (previous as unknown as Record<string, unknown>)[key];
    const after = (next as unknown as Record<string, unknown>)[key];
    if (JSON.stringify(before) !== JSON.stringify(after)) changed.push(key);
  }
  return changed;
}

export function saveTaskState(state: TaskState, reason: string): void {
  state.updated_at = nowIso();
  const path = statePathFor(state.cwd, state.task_id);
  const previous = readJsonFile<TaskState>(path);
  writeJsonFile(path, state);
  writeJsonFile(latestPointerPath(state.cwd), { task_id: state.task_id, updated_at: state.updated_at });
  appendFileSync(
    join(taskDir(state.cwd, state.task_id), "state-events.jsonl"),
    `${JSON.stringify({ timestamp: state.updated_at, reason, changedKeys: changedTopLevelKeys(previous, state) })}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  if (scratchpadWritesEnabled) writeScratchpad(state);
}

export function loadTaskState(cwd: string, taskId: string | undefined): TaskState | undefined {
  if (!taskId) return undefined;
  const state = readJsonFile<TaskState>(statePathFor(cwd, taskId));
  if (state?.schema_version !== 1) return undefined;
  return state;
}

export function isTaskArchived(cwd: string, taskId: string): boolean {
  return existsSync(archivedMarkerPath(cwd, taskId));
}

export function listTaskStates(cwd: string, includeArchived = false): TaskState[] {
  const root = taskRoot(cwd);
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => loadTaskState(cwd, entry.name))
    .filter((state): state is TaskState => !!state)
    .filter((state) => includeArchived || !isTaskArchived(cwd, state.task_id))
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
}

export function loadLatestTaskState(cwd: string): TaskState | undefined {
  const pointer = readJsonFile<{ task_id?: string }>(latestPointerPath(cwd));
  const pointed = loadTaskState(cwd, pointer?.task_id);
  if (pointed && !isTaskArchived(cwd, pointed.task_id)) return pointed;
  return listTaskStates(cwd, false)[0];
}

export function archiveTask(cwd: string, taskId: string): void {
  const markerPath = archivedMarkerPath(cwd, taskId);
  mkdirSync(dirname(markerPath), { recursive: true });
  writeFileSync(markerPath, `archivedAt=${nowIso()}\n`, { encoding: "utf8", mode: 0o600 });
}

export function summarizeTask(state: TaskState): TaskSummary {
  const progress = planProgress(state);
  return {
    task_id: state.task_id,
    status: state.status,
    goal: state.normalized_goal || state.user_goal,
    updated_at: state.updated_at,
    current_step_id: state.current_step_id,
    progress: `${progress.done}/${progress.total}`,
    archived: isTaskArchived(state.cwd, state.task_id),
  };
}

export function formatTaskSummaries(states: TaskState[]): string {
  if (states.length === 0) return "No reliability tasks found.";
  return states.map((state) => {
    const summary = summarizeTask(state);
    const archived = summary.archived ? " archived" : "";
    return `${summary.task_id.slice(0, 8)}  ${summary.status}${archived}  ${summary.progress}  ${summary.updated_at}  ${truncate(summary.goal, 90)}`;
  }).join("\n");
}

export function resolveTaskQuery(cwd: string, query: string | undefined, includeArchived = true): { state?: TaskState; error?: string } {
  const trimmed = query?.trim();
  if (!trimmed) {
    const latest = loadLatestTaskState(cwd);
    return latest ? { state: latest } : { error: "No latest reliability task found." };
  }
  const matches = listTaskStates(cwd, includeArchived).filter((state) => state.task_id === trimmed || state.task_id.startsWith(trimmed));
  if (matches.length === 1) return { state: matches[0] };
  if (matches.length === 0) return { error: `No reliability task matches '${trimmed}'.` };
  return { error: `Ambiguous task id '${trimmed}': ${matches.map((state) => state.task_id.slice(0, 8)).join(", ")}` };
}

export function readProjectConfig(ctx: ExtensionContext): Partial<ReliabilityConfig> {
  try {
    if (typeof ctx.isProjectTrusted === "function" && !ctx.isProjectTrusted()) return {};
    return readJsonFile<Partial<ReliabilityConfig>>(resolve(ctx.cwd, CONFIG_DIR_NAME, "reliability.json")) ?? {};
  } catch {
    return {};
  }
}

export function persistedPointerFromSession(ctx: ExtensionContext): PersistedExtensionState | undefined {
  const branch = ctx.sessionManager.getBranch() as Array<{ type?: string; customType?: string; data?: PersistedExtensionState }>;
  return branch
    .filter((entry) => entry.type === "custom" && entry.customType === CUSTOM_STATE_TYPE)
    .map((entry) => entry.data)
    .filter((data): data is PersistedExtensionState => !!data && typeof data.enabled === "boolean")
    .at(-1);
}

export function persistExtensionState(pi: ExtensionAPI, enabled: boolean, state: TaskState | undefined): void {
  pi.appendEntry(CUSTOM_STATE_TYPE, {
    enabled,
    taskId: state?.task_id,
    taskDir: state ? taskDir(state.cwd, state.task_id) : undefined,
    updatedAt: nowIso(),
  } satisfies PersistedExtensionState);
}
