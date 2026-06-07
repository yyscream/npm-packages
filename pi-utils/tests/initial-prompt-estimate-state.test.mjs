import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildInitialPromptEstimateKey,
  resolveInitialPromptEstimateRefreshDecision,
} from "../src/initial-prompt-estimate-state.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

assert.equal(
  buildInitialPromptEstimateKey({
    uncalibratedTotal: 12098,
    promptText: 8123,
    toolSchemas: 3847,
    framing: 128,
    toolCount: 18,
    calibrationMultiplier: 0.761,
    calibrationSamples: 20,
    low: 7800,
    high: 8600,
  }),
  "12098:8123:3847:128:18:0.761:20:7800:8600",
  "estimate keys should include prompt, tools, framing, calibration, and range inputs",
);

assert.equal(
  resolveInitialPromptEstimateRefreshDecision({
    requestId: 3,
    currentRequestId: 4,
    initialKey: "old-key",
    latestKey: "new-key",
  }),
  "ignore-stale-request",
  "older in-flight estimates should not publish or restart",
);

assert.equal(
  resolveInitialPromptEstimateRefreshDecision({
    requestId: 4,
    currentRequestId: 4,
    initialKey: "same-key",
    latestKey: "same-key",
  }),
  "accept-exported-estimate",
  "matching keys on the latest request should accept the export-backed estimate",
);

assert.equal(
  resolveInitialPromptEstimateRefreshDecision({
    requestId: 4,
    currentRequestId: 4,
    initialKey: "before-tools-change",
    latestKey: "after-tools-change",
  }),
  "restart-inputs-changed",
  "same request with changed prompt/tool/calibration inputs should restart estimation",
);

const serviceSource = await readFile(join(root, "src", "initial-prompt-estimate-service.ts"), "utf8");
assert.match(serviceSource, /export async function estimateStableInitialPromptFromPiContext/, "/stats-pi should have a shared stable one-shot estimator");
assert.match(serviceSource, /export function createInitialPromptEstimateService/, "footer should have a shared cached estimate service");
assert.match(serviceSource, /estimateInitialPromptFromPiExport/, "shared service should still use the export-backed estimator");
assert.match(serviceSource, /publishFallback\?: boolean/, "footer callers should be able to avoid publishing provisional fallback PI values");
assert.match(serviceSource, /restart-inputs-changed[\s\S]*continue;/, "changed inputs should retry inside the shared service");
