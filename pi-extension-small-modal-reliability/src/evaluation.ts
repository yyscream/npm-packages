import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";
import { buildContextHeader } from "./context-builder.ts";
import { evaluateCompletionGate } from "./completion-gate.ts";
import { normalizeConfig } from "./config.ts";
import { shouldBlockRepeat } from "./loop-detector.ts";
import { createTaskState } from "./task-state.ts";
import { recordToolCall, updateToolResult } from "./tool-normalizer.ts";
import { nowIso, writeJsonFile } from "./utils.ts";
import { computeVerification } from "./verification-state.ts";
import { parseVerificationResult } from "./verifier.ts";

export type ReliabilityEvaluationScenarioResult = {
  id: string;
  name: string;
  category: "loop" | "completion" | "verification" | "context" | "resume";
  passed: boolean;
  metric: Record<string, number | string | boolean>;
  notes: string;
};

export type ReliabilityEvaluationReport = {
  schema_version: 1;
  generated_at: string;
  cwd: string;
  mode: "offline-harness";
  scenarios: ReliabilityEvaluationScenarioResult[];
  metrics: {
    total: number;
    passed: number;
    failed: number;
    pass_rate: number;
    repeated_action_blocks: number;
    false_completion_blocks: number;
    verification_failures_caught: number;
    average_context_chars: number;
  };
  interpretation: string;
};

function scenario(id: string, name: string, category: ReliabilityEvaluationScenarioResult["category"], passed: boolean, metric: Record<string, number | string | boolean>, notes: string): ReliabilityEvaluationScenarioResult {
  return { id, name, category, passed, metric, notes };
}

export function runOfflineReliabilityEvaluation(cwd: string): ReliabilityEvaluationReport {
  const generatedAt = nowIso();
  const scenarios: ReliabilityEvaluationScenarioResult[] = [];

  {
    const config = normalizeConfig({ profile: "strict" });
    const state = createTaskState(cwd, "Need to avoid repeated tool loops while reading README.", undefined, config);
    recordToolCall(state, "r1", "read", { path: "README.md" });
    updateToolResult(state, "r1", "read", { path: "README.md" }, false, "OK: read README", "OK: read README", config);
    const blockReason = shouldBlockRepeat(state, "read", { path: "README.md" }, config);
    scenarios.push(scenario(
      "strict-repeat-block",
      "Strict profile blocks repeated identical action after one prior attempt",
      "loop",
      Boolean(blockReason),
      { blocked: Boolean(blockReason), prior_tool_calls: state.tool_history.length },
      blockReason || "Expected repeat-block reason was absent.",
    ));
  }

  {
    const config = normalizeConfig({ profile: "strict" });
    const state = createTaskState(cwd, "Ensure deployment verification is complete before claiming success.", undefined, config);
    const gate = evaluateCompletionGate(state, { role: "assistant", content: [{ type: "text", text: "Implemented and complete." }] }, config);
    scenarios.push(scenario(
      "strict-false-completion-gate",
      "Strict profile gates unsupported completion claims",
      "completion",
      gate.triggered && gate.unknown > 0,
      { triggered: gate.triggered, unknown: gate.unknown, failed: gate.failed },
      gate.message,
    ));
  }

  {
    const config = normalizeConfig({ profile: "balanced" });
    const state = createTaskState(cwd, "Need tests to pass before final answer.", undefined, config);
    recordToolCall(state, "v1", "bash", { command: "pytest" });
    updateToolResult(state, "v1", "bash", { command: "pytest" }, true, "Tests failed", "==== 2 failed, 3 passed in 1.23s ====", config);
    const verification = computeVerification(state);
    scenarios.push(scenario(
      "verification-failure-caught",
      "Failed verification command marks criteria failed",
      "verification",
      verification.some((item) => item.status === "failed"),
      { failed_criteria: verification.filter((item) => item.status === "failed").length },
      verification.map((item) => `${item.status}:${item.criterion}`).join("; "),
    ));
  }

  {
    const parsed = parseVerificationResult("cargo test", "test result: ok. 10 passed; 0 failed; 0 ignored", false);
    scenarios.push(scenario(
      "verification-parser-pass",
      "Verification parser recognizes common pass output",
      "verification",
      parsed.status === "passed" && parsed.framework === "Cargo",
      { status: parsed.status, framework: parsed.framework },
      parsed.summary,
    ));
  }

  {
    const compactConfig = normalizeConfig({ contextMode: "compact" });
    const deltaConfig = normalizeConfig({ contextMode: "delta" });
    const state = createTaskState(cwd, "Keep context headers small across repeated turns.", undefined, compactConfig);
    state.known_facts.push("Fact A", "Fact B", "Fact C");
    const compact = buildContextHeader(state, compactConfig);
    const firstDelta = buildContextHeader(state, deltaConfig);
    const secondDelta = buildContextHeader(state, deltaConfig, firstDelta.snapshot);
    scenarios.push(scenario(
      "context-delta-smaller",
      "Delta context avoids reinjecting unchanged state",
      "context",
      secondDelta.header.length < compact.header.length,
      { compact_chars: compact.header.length, delta_chars: secondDelta.header.length },
      "Second delta header should be smaller than compact header when no material state changed.",
    ));
  }

  const total = scenarios.length;
  const passed = scenarios.filter((item) => item.passed).length;
  const failed = total - passed;
  const contextScenarios = scenarios.filter((item) => item.category === "context");
  const averageContextChars = contextScenarios.length
    ? Math.round(contextScenarios.reduce((sum, item) => sum + Number(item.metric.delta_chars ?? item.metric.compact_chars ?? 0), 0) / contextScenarios.length)
    : 0;

  return {
    schema_version: 1,
    generated_at: generatedAt,
    cwd,
    mode: "offline-harness",
    scenarios,
    metrics: {
      total,
      passed,
      failed,
      pass_rate: total ? passed / total : 0,
      repeated_action_blocks: scenarios.filter((item) => item.category === "loop" && item.passed).length,
      false_completion_blocks: scenarios.filter((item) => item.category === "completion" && item.passed).length,
      verification_failures_caught: scenarios.filter((item) => item.id === "verification-failure-caught" && item.passed).length,
      average_context_chars: averageContextChars,
    },
    interpretation: failed === 0
      ? "Offline harness checks passed. This validates deterministic reliability mechanisms, not live model quality. Run representative live small-model tasks to measure model-specific completion rates."
      : "One or more offline harness checks failed. Fix deterministic harness behavior before live small-model evaluation.",
  };
}

export function formatEvaluationReport(report: ReliabilityEvaluationReport): string {
  const lines = [
    "# Reliability Harness Evaluation",
    "",
    `Generated: ${report.generated_at}`,
    `Mode: ${report.mode}`,
    `Pass rate: ${(report.metrics.pass_rate * 100).toFixed(1)}% (${report.metrics.passed}/${report.metrics.total})`,
    `Repeated-action blocks: ${report.metrics.repeated_action_blocks}`,
    `False-completion blocks: ${report.metrics.false_completion_blocks}`,
    `Verification failures caught: ${report.metrics.verification_failures_caught}`,
    `Average context chars: ${report.metrics.average_context_chars}`,
    "",
    "## Scenarios",
    ...report.scenarios.map((item) => `- ${item.passed ? "PASS" : "FAIL"} ${item.id}: ${item.name} — ${item.notes}`),
    "",
    "## Interpretation",
    report.interpretation,
  ];
  return `${lines.join("\n")}\n`;
}

export function writeEvaluationReport(cwd: string, report: ReliabilityEvaluationReport): { jsonPath: string; markdownPath: string } {
  const dir = resolve(cwd, CONFIG_DIR_NAME, "reliability-evaluations");
  mkdirSync(dir, { recursive: true });
  const stamp = report.generated_at.replace(/[:.]/g, "-");
  const jsonPath = join(dir, `${stamp}.json`);
  const markdownPath = join(dir, `${stamp}.md`);
  writeJsonFile(jsonPath, report);
  writeFileSync(markdownPath, formatEvaluationReport(report), { encoding: "utf8", mode: 0o600 });
  return { jsonPath, markdownPath };
}
