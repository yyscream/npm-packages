export type WorkflowErrorKind =
  | "validation_error"
  | "load_error"
  | "task_error"
  | "phase_error"
  | "cancelled"
  | "timeout"
  | "budget_exhausted"
  | "internal_error";

export class WorkflowError extends Error {
  readonly kind: WorkflowErrorKind;

  constructor(kind: WorkflowErrorKind, message: string) {
    super(message);
    this.name = "WorkflowError";
    this.kind = kind;
  }
}

export class WorkflowValidationError extends WorkflowError {
  readonly issues: string[];
  readonly sourcePath?: string;

  constructor(issues: string[], sourcePath?: string) {
    super("validation_error", issues.join("\n"));
    this.name = "WorkflowValidationError";
    this.issues = issues;
    this.sourcePath = sourcePath;
  }
}

export class WorkflowLoadError extends WorkflowError {
  readonly issues: string[];

  constructor(issues: string[]) {
    super("load_error", issues.join("\n"));
    this.name = "WorkflowLoadError";
    this.issues = issues;
  }
}

export class WorkflowCancelledError extends WorkflowError {
  constructor(message = "Workflow run was cancelled") {
    super("cancelled", message);
    this.name = "WorkflowCancelledError";
  }
}

export class WorkflowTaskError extends WorkflowError {
  readonly taskId: string;

  constructor(taskId: string, message: string) {
    super("task_error", message);
    this.name = "WorkflowTaskError";
    this.taskId = taskId;
  }
}

export class WorkflowPhaseError extends WorkflowError {
  readonly phaseId: string;

  constructor(phaseId: string, message: string) {
    super("phase_error", message);
    this.name = "WorkflowPhaseError";
    this.phaseId = phaseId;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function isCancellation(error: unknown): boolean {
  return error instanceof WorkflowCancelledError || (error instanceof WorkflowError && error.kind === "cancelled");
}
