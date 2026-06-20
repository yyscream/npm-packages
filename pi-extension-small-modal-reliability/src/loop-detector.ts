import type { ReliabilityConfig, TaskState, ToolHistoryItem } from "./types.ts";
import { hashToolCall } from "./utils.ts";

export function toolHistoryForHash(state: TaskState, hash: string): ToolHistoryItem[] {
  return state.tool_history.filter((item) => item.arguments_hash === hash);
}

export function shouldBlockRepeat(state: TaskState, toolName: string, input: unknown, config: ReliabilityConfig): string | undefined {
  if (toolName.startsWith("reliability_")) return undefined;
  const hash = hashToolCall(toolName, input);
  const existing = toolHistoryForHash(state, hash);
  const priorAttempts = existing.filter((item) => item.status !== "blocked").length;
  const priorFailures = existing.filter((item) => item.status === "error").length;

  if (priorFailures >= 2) {
    return `Blocked repeated failing action: ${toolName} with identical arguments failed ${priorFailures} time(s). Choose a different strategy.`;
  }
  if (config.profile === "relaxed") {
    return undefined;
  }
  if (priorAttempts >= config.maxRepeatedAction - 1) {
    return `Blocked repeated action: ${toolName} with identical arguments reached the ${config.maxRepeatedAction}x ${config.profile} profile limit. Choose a different strategy.`;
  }
  return undefined;
}
