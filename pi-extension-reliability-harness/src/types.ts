import { StringEnum } from "@earendil-works/pi-ai";

export type TaskStatus = "planning" | "executing" | "blocked" | "verifying" | "complete" | "failed";
export type StepStatus = "pending" | "in_progress" | "complete" | "blocked" | "skipped";
export type ToolStatus = "called" | "success" | "error" | "blocked";
export type VerificationStatus = "passed" | "failed" | "unknown";
export type ReliabilityProfile = "strict" | "balanced" | "relaxed";
export type ContextHeaderMode = "full" | "compact" | "delta";
export type OrchestrationMode = "prompt" | "separate-model";
export type ReliabilityRole = "supervisor" | "worker" | "verifier";

export type PlanStep = {
  step_id: string;
  title: string;
  description: string;
  status: StepStatus;
  depends_on: string[];
  expected_output: string;
  verification: string;
};

export type ToolHistoryItem = {
  timestamp: string;
  tool_call_id?: string;
  step_id?: string;
  tool: string;
  arguments_hash: string;
  arguments_preview: string;
  status: ToolStatus;
  summary?: string;
  raw_log_path?: string;
};

export type VerificationRecord = {
  criterion: string;
  status: VerificationStatus;
  evidence: string;
  remaining_work: string;
  source: "harness" | "model" | "user";
  updated_at: string;
};

export type TaskState = {
  schema_version: 1;
  task_id: string;
  created_at: string;
  updated_at: string;
  cwd: string;
  session_file?: string;
  status: TaskStatus;
  user_goal: string;
  normalized_goal: string;
  success_criteria: string[];
  constraints: string[];
  current_phase: string;
  current_step_id: string;
  plan: PlanStep[];
  completed_steps: string[];
  blocked_steps: string[];
  known_facts: string[];
  open_questions: string[];
  decisions: string[];
  tool_history: ToolHistoryItem[];
  files_touched: string[];
  read_files: string[];
  modified_files: string[];
  errors: string[];
  loop_warnings: string[];
  verification: VerificationRecord[];
  next_action: string;
  final_answer_requirements: string[];
  counters: {
    context_injections: number;
    model_responses: number;
    tool_calls: number;
    repeated_action_limit: number;
  };
};

export type ReliabilityConfig = {
  enabled: boolean;
  profile: ReliabilityProfile;
  requirePlan: boolean;
  requireVerification: boolean;
  maxRepeatedAction: number;
  scratchpadEnabled: boolean;
  contextBudgetChars: number;
  contextMode: ContextHeaderMode;
  progressWidget: boolean;
  storeRawToolLogs: boolean;
  rawLogMaxChars: number;
  orchestrationMode: OrchestrationMode;
  orchestrationModels: Partial<Record<ReliabilityRole, string>>;
  orchestrationTools: string[];
  orchestrationMaxOutputChars: number;
};

export type VerificationCommandSuggestion = {
  command: string;
  label: string;
  reason: string;
};

export type TaskSummary = {
  task_id: string;
  status: TaskStatus;
  goal: string;
  updated_at: string;
  current_step_id: string;
  progress: string;
  archived: boolean;
};

export type ParsedVerificationResult = {
  command: string;
  framework: string;
  status: VerificationStatus;
  summary: string;
  failure_excerpt?: string;
  counts?: {
    passed?: number;
    failed?: number;
    errors?: number;
    warnings?: number;
  };
};

export type CompletionGateResult = {
  triggered: boolean;
  strict: boolean;
  failed: number;
  unknown: number;
  message: string;
  verification: VerificationRecord[];
};

export type ContextSnapshot = {
  goal: string;
  currentStepId: string;
  planStatuses: string;
  completedSteps: string;
  blockedSteps: string;
  latestFacts: string;
  latestErrors: string;
  latestWarnings: string;
  verificationStatuses: string;
  nextAction: string;
  filesTouched: string;
};

export type ContextHeaderResult = {
  header: string;
  snapshot: ContextSnapshot;
};

export type PersistedExtensionState = {
  enabled: boolean;
  taskId?: string;
  taskDir?: string;
  updatedAt: string;
};

export const CUSTOM_STATE_TYPE = "reliability-harness-state";
export const STATUS_KEY = "reliability";
export const WIDGET_KEY = "reliability-harness";
export const DEFAULT_CONTEXT_BUDGET_CHARS = 6000;
export const MAX_HISTORY = 80;
export const MAX_FACTS = 40;
export const MAX_ERRORS = 30;
export const DEFAULT_RAW_LOG_MAX_CHARS = 50_000;
export const DEFAULT_ORCHESTRATION_MAX_OUTPUT_CHARS = 50_000;

export const PROFILE_DEFAULTS: Record<ReliabilityProfile, Omit<ReliabilityConfig, "enabled" | "profile">> = {
  strict: {
    requirePlan: true,
    requireVerification: true,
    maxRepeatedAction: 2,
    scratchpadEnabled: true,
    contextBudgetChars: DEFAULT_CONTEXT_BUDGET_CHARS,
    contextMode: "full",
    progressWidget: true,
    storeRawToolLogs: false,
    rawLogMaxChars: DEFAULT_RAW_LOG_MAX_CHARS,
    orchestrationMode: "prompt",
    orchestrationModels: {},
    orchestrationTools: ["read", "grep", "find", "ls"],
    orchestrationMaxOutputChars: DEFAULT_ORCHESTRATION_MAX_OUTPUT_CHARS,
  },
  balanced: {
    requirePlan: true,
    requireVerification: true,
    maxRepeatedAction: 3,
    scratchpadEnabled: true,
    contextBudgetChars: DEFAULT_CONTEXT_BUDGET_CHARS,
    contextMode: "compact",
    progressWidget: true,
    storeRawToolLogs: false,
    rawLogMaxChars: DEFAULT_RAW_LOG_MAX_CHARS,
    orchestrationMode: "prompt",
    orchestrationModels: {},
    orchestrationTools: ["read", "grep", "find", "ls"],
    orchestrationMaxOutputChars: DEFAULT_ORCHESTRATION_MAX_OUTPUT_CHARS,
  },
  relaxed: {
    requirePlan: false,
    requireVerification: false,
    maxRepeatedAction: 5,
    scratchpadEnabled: true,
    contextBudgetChars: DEFAULT_CONTEXT_BUDGET_CHARS,
    contextMode: "delta",
    progressWidget: true,
    storeRawToolLogs: false,
    rawLogMaxChars: DEFAULT_RAW_LOG_MAX_CHARS,
    orchestrationMode: "prompt",
    orchestrationModels: {},
    orchestrationTools: ["read", "grep", "find", "ls"],
    orchestrationMaxOutputChars: DEFAULT_ORCHESTRATION_MAX_OUTPUT_CHARS,
  },
};

export const DEFAULT_CONFIG: ReliabilityConfig = {
  enabled: false,
  profile: "balanced",
  ...PROFILE_DEFAULTS.balanced,
};

export const StepStatusSchema = StringEnum(["pending", "in_progress", "complete", "blocked", "skipped"] as const);
export const TaskStatusSchema = StringEnum(["planning", "executing", "blocked", "verifying", "complete", "failed"] as const);
export const VerificationStatusSchema = StringEnum(["passed", "failed", "unknown"] as const);
export const OrchestrationModeSchema = StringEnum(["prompt", "separate-model"] as const);
