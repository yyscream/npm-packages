export type WorkflowInput = Record<string, unknown>;

export type WorkflowDefinition = {
  schemaVersion: 1;
  key: string;
  name: string;
  description?: string;
  inputSchema?: unknown;
  defaults?: {
    maxConcurrency?: number;
    maxTasks?: number;
  };
  phases: WorkflowPhase[];
};

export type WorkflowPhase = {
  id: string;
  name: string;
  description?: string;
  mode: "sequential" | "parallel";
  maxConcurrency?: number;
  tasks: WorkflowTask[];
};

export type WorkflowTask = {
  id: string;
  name: string;
  agent?: string;
  prompt: string;
  tools?: string[];
  model?: string;
  cwd?: string;
};

export type WorkflowRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type PhaseRunStatus = WorkflowRunStatus;
export type TaskRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type WorkflowUsage = {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost?: number;
  contextTokens?: number;
  turns?: number;
};

export type WorkflowSubprocessEventType = "start" | "event" | "stdout" | "stderr" | "exit";

export type WorkflowSubprocessEvent = {
  type: WorkflowSubprocessEventType;
  timestamp: string;
  phaseId: string;
  phaseName: string;
  taskId: string;
  taskName: string;
  command?: string;
  cwd?: string;
  line?: string;
  eventType?: string;
  exitCode?: number;
};

export type WorkflowRun = {
  runId: string;
  workflowKey: string;
  workflowName: string;
  sourcePath?: string;
  status: WorkflowRunStatus;
  input: WorkflowInput;
  phases: PhaseRun[];
  startedAt: string;
  finishedAt?: string;
  summary?: string;
  error?: string;
};

export type PhaseRun = {
  phaseId: string;
  name: string;
  status: PhaseRunStatus;
  tasks: TaskRun[];
  startedAt?: string;
  finishedAt?: string;
  error?: string;
};

export type TaskRun = {
  taskId: string;
  name: string;
  status: TaskRunStatus;
  output?: string;
  error?: string;
  usage?: WorkflowUsage;
  startedAt?: string;
  finishedAt?: string;
};

export type WorkflowSourceScope = "bundled" | "project";

export type WorkflowSource = {
  path: string;
  scope: WorkflowSourceScope;
  definition: WorkflowDefinition;
};

export type TaskResult = {
  ok: boolean;
  output: string;
  error?: string;
  usage?: WorkflowUsage;
  raw?: unknown;
};

export type TaskContext = {
  cwd: string;
  input: WorkflowInput;
  run: WorkflowRun;
  phase: WorkflowPhase;
  priorOutputs: string;
  signal?: AbortSignal;
  onSubprocessEvent?: (event: WorkflowSubprocessEvent) => void;
};

export type TaskRunner = {
  runTask(task: WorkflowTask, context: TaskContext): Promise<TaskResult>;
};
