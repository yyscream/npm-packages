import { WorkflowValidationError } from "./errors.ts";
import type { WorkflowDefinition, WorkflowTask } from "./types.ts";

export const DEFAULT_MAX_CONCURRENCY = 3;
export const HARD_MAX_CONCURRENCY = 8;
export const DEFAULT_MAX_TASKS = 50;
export const HARD_MAX_TASKS = 100;

export const DEFAULT_ALLOWED_TOOLS = new Set(["read", "grep", "find", "ls"]);

export type ValidateWorkflowOptions = {
  sourcePath?: string;
  allowUnsafeTools?: boolean;
  allowedTools?: Set<string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function validateOptionalPositiveInteger(
  value: unknown,
  path: string,
  issues: string[],
  max: number,
): void {
  if (value === undefined) return;
  if (!isPositiveInteger(value)) {
    issues.push(`${path} must be a positive integer.`);
    return;
  }
  if (value > max) issues.push(`${path} must be <= ${max}.`);
}

function validateTools(task: WorkflowTask, path: string, issues: string[], options: ValidateWorkflowOptions): void {
  if (task.tools === undefined) return;
  if (!Array.isArray(task.tools)) {
    issues.push(`${path}.tools must be an array of strings.`);
    return;
  }

  const allowed = options.allowedTools ?? DEFAULT_ALLOWED_TOOLS;
  for (const [index, tool] of task.tools.entries()) {
    if (typeof tool !== "string" || !tool.trim()) {
      issues.push(`${path}.tools[${index}] must be a non-empty string.`);
      continue;
    }
    if (!options.allowUnsafeTools && !allowed.has(tool)) {
      issues.push(`${path}.tools[${index}] '${tool}' is not allowed in v0 workflows.`);
    }
  }
}

export function countWorkflowTasks(definition: Pick<WorkflowDefinition, "phases">): number {
  return definition.phases.reduce((total, phase) => total + phase.tasks.length, 0);
}

export function validateWorkflowDefinition(value: unknown, options: ValidateWorkflowOptions = {}): WorkflowDefinition {
  const issues: string[] = [];

  if (!isRecord(value)) {
    throw new WorkflowValidationError(["workflow definition must be an object."], options.sourcePath);
  }

  const definition = value as Partial<WorkflowDefinition>;

  if (definition.schemaVersion !== 1) issues.push("schemaVersion must be 1.");
  if (!isNonEmptyString(definition.key)) issues.push("key must be a non-empty string.");
  else if (!/^[a-z0-9][a-z0-9._-]*$/i.test(definition.key)) {
    issues.push("key must be slug-like: letters, numbers, dots, underscores, or dashes.");
  }
  if (!isNonEmptyString(definition.name)) issues.push("name must be a non-empty string.");
  if (definition.description !== undefined && typeof definition.description !== "string") {
    issues.push("description must be a string when provided.");
  }

  if (definition.defaults !== undefined) {
    if (!isRecord(definition.defaults)) {
      issues.push("defaults must be an object when provided.");
    } else {
      validateOptionalPositiveInteger(definition.defaults.maxConcurrency, "defaults.maxConcurrency", issues, HARD_MAX_CONCURRENCY);
      validateOptionalPositiveInteger(definition.defaults.maxTasks, "defaults.maxTasks", issues, HARD_MAX_TASKS);
    }
  }

  if (!Array.isArray(definition.phases) || definition.phases.length === 0) {
    issues.push("phases must contain at least one phase.");
  } else {
    const phaseIds = new Set<string>();
    let taskCount = 0;

    for (const [phaseIndex, phaseValue] of definition.phases.entries()) {
      const phasePath = `phases[${phaseIndex}]`;
      if (!isRecord(phaseValue)) {
        issues.push(`${phasePath} must be an object.`);
        continue;
      }

      const phase = phaseValue as WorkflowDefinition["phases"][number];
      if (!isNonEmptyString(phase.id)) issues.push(`${phasePath}.id must be a non-empty string.`);
      else if (phaseIds.has(phase.id)) issues.push(`${phasePath}.id '${phase.id}' is duplicated.`);
      else phaseIds.add(phase.id);

      if (!isNonEmptyString(phase.name)) issues.push(`${phasePath}.name must be a non-empty string.`);
      if (phase.description !== undefined && typeof phase.description !== "string") {
        issues.push(`${phasePath}.description must be a string when provided.`);
      }
      if (phase.mode !== "sequential" && phase.mode !== "parallel") {
        issues.push(`${phasePath}.mode must be 'sequential' or 'parallel'.`);
      }
      validateOptionalPositiveInteger(phase.maxConcurrency, `${phasePath}.maxConcurrency`, issues, HARD_MAX_CONCURRENCY);

      if (!Array.isArray(phase.tasks) || phase.tasks.length === 0) {
        issues.push(`${phasePath}.tasks must contain at least one task.`);
        continue;
      }

      const taskIds = new Set<string>();
      for (const [taskIndex, taskValue] of phase.tasks.entries()) {
        const taskPath = `${phasePath}.tasks[${taskIndex}]`;
        taskCount++;
        if (!isRecord(taskValue)) {
          issues.push(`${taskPath} must be an object.`);
          continue;
        }

        const task = taskValue as WorkflowTask;
        if (!isNonEmptyString(task.id)) issues.push(`${taskPath}.id must be a non-empty string.`);
        else if (taskIds.has(task.id)) issues.push(`${taskPath}.id '${task.id}' is duplicated within phase '${phase.id}'.`);
        else taskIds.add(task.id);

        if (!isNonEmptyString(task.name)) issues.push(`${taskPath}.name must be a non-empty string.`);
        if (!isNonEmptyString(task.prompt)) issues.push(`${taskPath}.prompt must be a non-empty string.`);
        if (task.agent !== undefined && typeof task.agent !== "string") issues.push(`${taskPath}.agent must be a string when provided.`);
        if (task.model !== undefined && typeof task.model !== "string") issues.push(`${taskPath}.model must be a string when provided.`);
        if (task.cwd !== undefined && typeof task.cwd !== "string") issues.push(`${taskPath}.cwd must be a string when provided.`);
        validateTools(task, taskPath, issues, options);
      }
    }

    const declaredMaxTasks = isRecord(definition.defaults) && typeof definition.defaults.maxTasks === "number"
      ? definition.defaults.maxTasks
      : DEFAULT_MAX_TASKS;
    if (declaredMaxTasks > HARD_MAX_TASKS) issues.push(`defaults.maxTasks must be <= ${HARD_MAX_TASKS}.`);
    if (taskCount > Math.min(declaredMaxTasks, HARD_MAX_TASKS)) {
      issues.push(`workflow defines ${taskCount} tasks, exceeding maxTasks ${Math.min(declaredMaxTasks, HARD_MAX_TASKS)}.`);
    }
  }

  if (issues.length > 0) throw new WorkflowValidationError(issues, options.sourcePath);
  return definition as WorkflowDefinition;
}

export function effectiveMaxConcurrency(value: number | undefined): number {
  return Math.max(1, Math.min(value ?? DEFAULT_MAX_CONCURRENCY, HARD_MAX_CONCURRENCY));
}
