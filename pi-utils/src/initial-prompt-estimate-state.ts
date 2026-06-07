export type InitialPromptEstimateRefreshDecision =
  | "accept-exported-estimate"
  | "ignore-stale-request"
  | "restart-inputs-changed";

export type InitialPromptEstimateRefreshDecisionInput = {
  requestId: number;
  currentRequestId: number;
  initialKey: string;
  latestKey: string;
};

export type InitialPromptEstimateKeyInput = {
  uncalibratedTotal: number;
  promptText: number;
  toolSchemas: number;
  framing: number;
  toolCount: number;
  calibrationMultiplier: number;
  calibrationSamples: number;
  low: number;
  high: number;
};

export function buildInitialPromptEstimateKey(estimate: InitialPromptEstimateKeyInput): string {
  return [
    estimate.uncalibratedTotal,
    estimate.promptText,
    estimate.toolSchemas,
    estimate.framing,
    estimate.toolCount,
    estimate.calibrationMultiplier,
    estimate.calibrationSamples,
    estimate.low,
    estimate.high,
  ].join(":");
}

export function resolveInitialPromptEstimateRefreshDecision({
  requestId,
  currentRequestId,
  initialKey,
  latestKey,
}: InitialPromptEstimateRefreshDecisionInput): InitialPromptEstimateRefreshDecision {
  if (requestId !== currentRequestId) return "ignore-stale-request";
  if (latestKey !== initialKey) return "restart-inputs-changed";
  return "accept-exported-estimate";
}
