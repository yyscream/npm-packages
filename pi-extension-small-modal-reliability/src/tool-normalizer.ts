import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { ParsedVerificationResult, ReliabilityConfig, TaskState, ToolHistoryItem } from "./types.ts";
import { MAX_ERRORS, MAX_FACTS, MAX_HISTORY } from "./types.ts";
import { displayPath, taskDir } from "./paths.ts";
import { selectNextStep, setStepStatus } from "./planner.ts";
import { contentToText, addUniqueBounded, hashToolCall, nowIso, pushBounded, stableStringify, truncate } from "./utils.ts";
import { truncateRawLog } from "./redaction.ts";
import { parseVerificationResult } from "./verifier.ts";
import { isVerificationCommand } from "./verification-suggestions.ts";
import { applyParsedVerificationToCriteria } from "./verification-state.ts";

export function extractCommand(input: unknown): string | undefined {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : undefined;
  return typeof record?.command === "string" ? record.command : undefined;
}

export function normalizeToolPath(cwd: string, value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const withoutAt = value.replace(/^@/, "");
  return resolve(cwd, withoutAt);
}

export function extractToolPaths(cwd: string, toolName: string, input: unknown): { read: string[]; modified: string[]; touched: string[] } {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const rawPaths: unknown[] = [];
  if ("path" in record) rawPaths.push(record.path);
  if ("paths" in record && Array.isArray(record.paths)) rawPaths.push(...record.paths);

  const paths = rawPaths
    .map((value) => normalizeToolPath(cwd, value))
    .filter((value): value is string => !!value)
    .map((path) => displayPath(cwd, path));

  const modified = toolName === "write" || toolName === "edit" ? paths : [];
  const read = toolName === "read" || toolName === "grep" || toolName === "find" || toolName === "ls" ? paths : [];
  return { read, modified, touched: paths };
}

export function summarizeToolResult(event: { content: unknown; isError?: boolean }): string {
  const text = contentToText(event.content);
  const prefix = event.isError ? "ERROR: " : "OK: ";
  return truncate(`${prefix}${text}`, 600);
}

function safeLogFilePart(value: string): string {
  return value.replace(/[^a-z0-9_.-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "tool";
}

export function writeRawToolLog(state: TaskState, toolName: string, toolCallId: string | undefined, rawOutput: string, config: ReliabilityConfig): string | undefined {
  if (!config.storeRawToolLogs || rawOutput.length === 0) return undefined;
  const timestamp = nowIso().replace(/[:.]/g, "-");
  const fileName = `${timestamp}-${safeLogFilePart(toolName)}-${safeLogFilePart(toolCallId ?? "no-id")}.log`;
  const logPath = join(taskDir(state.cwd, state.task_id), "tool-logs", fileName);
  mkdirSync(dirname(logPath), { recursive: true });
  writeFileSync(logPath, truncateRawLog(rawOutput, config.rawLogMaxChars), { encoding: "utf8", mode: 0o600 });
  return displayPath(state.cwd, logPath);
}

export function recordToolCall(state: TaskState, toolCallId: string | undefined, toolName: string, input: unknown): ToolHistoryItem {
  const step = selectNextStep(state);
  if (step?.status === "blocked") {
    step.status = "in_progress";
    state.blocked_steps = state.blocked_steps.filter((stepId) => stepId !== step.step_id);
  }
  const item: ToolHistoryItem = {
    timestamp: nowIso(),
    tool_call_id: toolCallId,
    step_id: step?.step_id,
    tool: toolName,
    arguments_hash: hashToolCall(toolName, input),
    arguments_preview: truncate(stableStringify(input), 1000),
    status: "called",
  };
  pushBounded(state.tool_history, item, MAX_HISTORY);
  state.counters.tool_calls += 1;
  state.status = "executing";
  state.current_phase = step?.title ?? state.current_phase;
  return item;
}

function updatePathTracking(state: TaskState, toolName: string, input: unknown): void {
  const paths = extractToolPaths(state.cwd, toolName, input);
  for (const file of paths.read) addUniqueBounded(state.read_files, file, 120);
  for (const file of paths.modified) addUniqueBounded(state.modified_files, file, 120);
  for (const file of paths.touched) addUniqueBounded(state.files_touched, file, 120);
}

function recordVerificationCommandResult(state: TaskState, toolName: string, input: unknown, isError: boolean, rawOutput: string): ParsedVerificationResult | undefined {
  if (toolName !== "bash") return undefined;
  const command = extractCommand(input);
  if (!command || !isVerificationCommand(command)) return undefined;
  const parsed = parseVerificationResult(command, rawOutput, isError);
  applyParsedVerificationToCriteria(state, parsed);
  if (parsed.status === "failed") {
    setStepStatus(state, "S3", "blocked");
    state.status = "blocked";
  } else {
    setStepStatus(state, "S3", "complete");
  }
  return parsed;
}

export function updateToolResult(state: TaskState, toolCallId: string | undefined, toolName: string, input: unknown, isError: boolean, summary: string, rawOutput = summary, config?: ReliabilityConfig): void {
  const rawLogPath = config ? writeRawToolLog(state, toolName, toolCallId, rawOutput, config) : undefined;
  const match = [...state.tool_history].reverse().find((item) => item.tool_call_id === toolCallId);
  if (match) {
    match.status = isError ? "error" : "success";
    match.summary = truncate(summary, 1000);
    if (rawLogPath) match.raw_log_path = rawLogPath;
  }
  updatePathTracking(state, toolName, input);
  if (isError) pushBounded(state.errors, `${toolName}: ${truncate(summary, 300)}`, MAX_ERRORS);
  const parsed = recordVerificationCommandResult(state, toolName, input, isError, rawOutput);
  if (parsed) addUniqueBounded(state.known_facts, `Verification command: ${parsed.summary}`, MAX_FACTS);
}
