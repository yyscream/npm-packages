import type { CompletionGateResult, ReliabilityConfig, TaskState } from "./types.ts";
import { DEFAULT_CONFIG } from "./types.ts";
import { assistantHasToolCall, assistantText } from "./utils.ts";
import { computeVerification, formatVerification } from "./verification-state.ts";

function assistantClaimsCompletion(text: string): boolean {
  return /\b(done|complete|completed|implemented|fixed|finished|resolved|verified|validated|created)\b/i.test(text)
    && !/\b(partial|partially|not complete|remaining|unknown|cannot verify|unverified)\b/i.test(text);
}

export function evaluateCompletionGate(state: TaskState, assistantMessageOrText: unknown, hasToolCallOrConfig: boolean | ReliabilityConfig, maybeConfig?: ReliabilityConfig): CompletionGateResult {
  const text = typeof assistantMessageOrText === "string" ? assistantMessageOrText : assistantText(assistantMessageOrText);
  const hasToolCall = typeof hasToolCallOrConfig === "boolean" ? hasToolCallOrConfig : assistantHasToolCall(assistantMessageOrText);
  const config = typeof hasToolCallOrConfig === "boolean" ? maybeConfig ?? DEFAULT_CONFIG : hasToolCallOrConfig;
  const triggered = assistantClaimsCompletion(text) && !hasToolCall;
  const verification = computeVerification(state);
  const failed = verification.filter((item) => item.status === "failed").length;
  const unknown = verification.filter((item) => item.status === "unknown").length;
  const gate = triggered && config.requireVerification && (failed > 0 || unknown > 0);
  return {
    triggered: gate,
    strict: config.profile === "strict",
    failed,
    unknown,
    message: gate ? `Reliability completion gate triggered: ${failed} failed and ${unknown} unknown verification criteria remain.` : "Completion gate not triggered.",
    verification,
  };
}

export function buildCompletionGatePrompt(stateOrResult: TaskState | CompletionGateResult, maybeResult?: CompletionGateResult): string {
  const result = maybeResult ?? stateOrResult as CompletionGateResult;
  return [
    result.message,
    "Do not claim completion yet. Provide evidence, run verification, revise the plan, or clearly report partial completion.",
    formatVerification(result.verification),
  ].join("\n\n");
}
