import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import reliabilityHarnessExtension from "../index.ts";
import { addOrUpdateVerification, buildContextHeader, createPlanModeRun, createTaskState, extractPlanModeProgress, markTaskCompleteIfVerified, nextPlanModePhaseAfterAgent, normalizeConfig, parseVerificationResult, redactSensitiveText, runOfflineReliabilityEvaluation, truncateRawLog } from "../src/core.ts";
import { buildDryRunOrchestration, parseVerificationEvidenceFromText, parseWorkerResultFromText } from "../src/orchestration.ts";

function createHarness(cwd, options = {}) {
  const handlers = new Map();
  const commands = new Map();
  const tools = new Map();
  const entries = [];
  const notifications = [];
  const sentUserMessages = [];
  const statuses = new Map();
  const widgets = new Map();
  const newSessions = [];

  const pi = {
    registerFlag() {},
    getFlag(name) {
      return options.flags?.[name] ?? false;
    },
    registerCommand(name, definition) {
      commands.set(name, definition);
    },
    registerTool(definition) {
      tools.set(definition.name, definition);
    },
    on(name, handler) {
      if (!handlers.has(name)) handlers.set(name, []);
      handlers.get(name).push(handler);
    },
    appendEntry(customType, data) {
      entries.push({ type: "custom", customType, data });
    },
    sendUserMessage(content, sendOptions) {
      sentUserMessages.push({ content, options: sendOptions });
    },
  };

  reliabilityHarnessExtension(pi);

  const ctx = {
    cwd,
    hasUI: true,
    isProjectTrusted: () => true,
    waitForIdle: async () => {},
    async newSession(options = {}) {
      const sessionEntries = [];
      const sessionFile = join(cwd, `mock-new-session-${newSessions.length + 1}.jsonl`);
      const sessionManager = {
        appendCustomEntry(customType, data) {
          sessionEntries.push({ type: "custom", customType, data });
          return `custom-${sessionEntries.length}`;
        },
      };
      await options.setup?.(sessionManager);
      const sentUserMessagesForSession = [];
      const nextCtx = {
        ...ctx,
        sessionManager: {
          getBranch: () => sessionEntries,
          getSessionFile: () => sessionFile,
        },
        sendUserMessage: async (content, sendOptions) => {
          sentUserMessagesForSession.push({ content, options: sendOptions });
        },
      };
      await options.withSession?.(nextCtx);
      newSessions.push({ sessionFile, entries: sessionEntries, sentUserMessages: sentUserMessagesForSession });
      return { cancelled: false };
    },
    sessionManager: {
      getBranch: () => entries,
      getSessionFile: () => join(cwd, "mock-session.jsonl"),
    },
    ui: {
      notify(message, level = "info") {
        notifications.push({ message, level });
      },
      setStatus(key, value) {
        statuses.set(key, value);
      },
      setWidget(key, value) {
        widgets.set(key, value);
      },
      theme: {
        fg: (_color, text) => text,
        bold: (text) => text,
        strikethrough: (text) => text,
      },
    },
  };

  const emit = async (name, event = {}) => {
    const results = [];
    for (const handler of handlers.get(name) ?? []) {
      results.push(await handler(event, ctx));
    }
    return results;
  };

  return { commands, tools, emit, ctx, entries, notifications, sentUserMessages, statuses, widgets, newSessions };
}

function tempCwd() {
  return mkdtempSync(join(tmpdir(), "pi-reliability-test-"));
}

function cleanup(cwd) {
  rmSync(cwd, { recursive: true, force: true });
}

function taskIds(cwd) {
  return readdirSync(join(cwd, ".pi", "tasks"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

test("creates task state, scratchpad, and context header", async () => {
  const cwd = tempCwd();
  try {
    const harness = createHarness(cwd);
    await harness.emit("session_start");
    await harness.commands.get("reliability").handler("on implement login flow", harness.ctx);
    await harness.emit("before_agent_start", { prompt: "implement login flow", systemPrompt: "sys" });

    const contextResults = await harness.emit("context", { messages: [{ role: "user", content: "hello" }] });
    const injectedMessages = contextResults.at(-1)?.messages ?? [];
    assert.equal(injectedMessages.length, 2);
    assert.match(JSON.stringify(injectedMessages.at(-1)), /RELIABILITY (LITE|HARNESS) ACTIVE/);

    const [taskId] = taskIds(cwd);
    assert.ok(taskId);
    const state = JSON.parse(readFileSync(join(cwd, ".pi", "tasks", taskId, "state.json"), "utf8"));
    assert.equal(state.normalized_goal, "implement login flow");
    assert.ok(state.plan.length >= 4);
    assert.match(readFileSync(join(cwd, ".pi", "tasks", taskId, "scratchpad.md"), "utf8"), /Task Scratchpad/);
  } finally {
    cleanup(cwd);
  }
});

test("new session starts armed instead of auto-resuming latest task", async () => {
  const cwd = tempCwd();
  try {
    const original = createHarness(cwd, { flags: { reliability: true } });
    await original.emit("session_start", { reason: "startup" });
    await original.commands.get("reliability").handler("on previous live task", original.ctx);
    assert.equal(taskIds(cwd).length, 1);

    const fresh = createHarness(cwd, { flags: { reliability: true } });
    await fresh.emit("session_start", { reason: "new" });
    await fresh.commands.get("reliability").handler("status", fresh.ctx);
    assert.match(fresh.notifications.at(-1).message, /waiting for the next task/);
    assert.doesNotMatch(fresh.notifications.at(-1).message, /previous live task/);
    assert.deepEqual(fresh.widgets.get("reliability-harness"), ["Reliability harness armed for next task"]);

    const resumed = createHarness(cwd);
    resumed.entries.push(original.entries.at(-1));
    await resumed.emit("session_start", { reason: "resume" });
    await resumed.commands.get("reliability").handler("status", resumed.ctx);
    assert.match(resumed.notifications.at(-1).message, /previous live task/);
  } finally {
    cleanup(cwd);
  }
});

test("plan mode command starts exploration in a fresh session with markdown artifacts", async () => {
  const cwd = tempCwd();
  try {
    const harness = createHarness(cwd);
    await harness.emit("session_start");
    await harness.commands.get("reliability").handler("--mode plan-on implement a plan-mode feature", harness.ctx);

    assert.equal(harness.newSessions.length, 1);
    const kickoff = harness.newSessions[0].sentUserMessages[0].content;
    assert.match(kickoff, /Phase: EXPLORE/);
    assert.match(kickoff, /01-exploration\.md/);

    const [taskId] = taskIds(cwd);
    assert.ok(taskId);
    assert.match(readFileSync(join(cwd, ".pi", "tasks", taskId, "plan-mode", "01-exploration.md"), "utf8"), /Status: TODO/);
    assert.match(readFileSync(join(cwd, ".pi", "tasks", taskId, "plan-mode", "02-implementation-plan.md"), "utf8"), /## Progress/);
    assert.ok(harness.statuses.has("reliability-plan-mode"));
  } finally {
    cleanup(cwd);
  }
});

test("plan mode verification failure creates failure artifact and reopens plan progress", () => {
  const cwd = tempCwd();
  try {
    const config = normalizeConfig({ profile: "balanced" });
    const task = createTaskState(cwd, "fix verification failure", undefined, config);
    const run = createPlanModeRun(task);
    writeFileSync(run.artifacts.plan, [
      "# Detailed Implementation Plan",
      "",
      "Status: IN_PROGRESS",
      "",
      "## Progress",
      "- [x] Implement the feature",
    ].join("\n"));
    writeFileSync(run.artifacts.verification, [
      "# Plan Mode Verification",
      "",
      "Status: FAILED",
      "",
      "Tests failed with one assertion error.",
    ].join("\n"));
    run.phase = "verify";

    const decision = nextPlanModePhaseAfterAgent(run);
    const progress = extractPlanModeProgress(readFileSync(run.artifacts.plan, "utf8"));

    assert.equal(decision.phase, "implement");
    assert.equal(progress.open, 1);
    assert.match(readFileSync(run.artifacts.plan, "utf8"), /Verification remediation/);
    assert.ok(readdirSync(run.artifacts.failuresDir).some((name) => name.endsWith(".md")));
  } finally {
    cleanup(cwd);
  }
});

test("adaptive default keeps simple tasks in lite mode", async () => {
  const cwd = tempCwd();
  try {
    const harness = createHarness(cwd);
    await harness.emit("session_start");
    await harness.commands.get("reliability").handler("on create a tiny file", harness.ctx);
    const before = await harness.emit("before_agent_start", { prompt: "create a tiny file", systemPrompt: "sys" });
    assert.match(before.at(-1).systemPrompt, /RELIABILITY LITE INSTRUCTIONS/);
    assert.doesNotMatch(before.at(-1).systemPrompt, /SUPERVISOR \/ WORKER SPLIT/);

    const contextResults = await harness.emit("context", { messages: [] });
    assert.match(JSON.stringify(contextResults.at(-1).messages), /RELIABILITY LITE ACTIVE/);
    await harness.commands.get("reliability").handler("status", harness.ctx);
    assert.match(harness.notifications.at(-1).message, /mode lite/);

    await assert.rejects(
      harness.tools.get("reliability_submit_worker_result").execute("worker-in-lite", {
        step_id: "S1",
        action_taken: "tried worker ceremony",
        result: "not allowed",
        status: "complete",
      }, undefined, undefined, harness.ctx),
      /disabled in lite mode/,
    );
  } finally {
    cleanup(cwd);
  }
});

test("adaptive mode escalates long work to supervised mode", async () => {
  const cwd = tempCwd();
  try {
    const harness = createHarness(cwd);
    await harness.emit("session_start");
    const prompt = "Refactor the authentication module, update tests, migrate related configuration, document the changes, and verify the full test suite without breaking existing behavior.";
    await harness.commands.get("reliability").handler(`on ${prompt}`, harness.ctx);
    const before = await harness.emit("before_agent_start", { prompt, systemPrompt: "sys" });
    assert.match(before.at(-1).systemPrompt, /RELIABILITY HARNESS INSTRUCTIONS/);
    assert.match(before.at(-1).systemPrompt, /SUPERVISOR \/ WORKER SPLIT/);
    await harness.commands.get("reliability").handler("status", harness.ctx);
    assert.match(harness.notifications.at(-1).message, /mode supervised/);
  } finally {
    cleanup(cwd);
  }
});

test("blocks exact repeated tool calls at the configured threshold", async () => {
  const cwd = tempCwd();
  try {
    const harness = createHarness(cwd);
    await harness.emit("session_start");
    await harness.commands.get("reliability").handler("on repeat test", harness.ctx);

    for (let i = 1; i <= 2; i++) {
      const results = await harness.emit("tool_call", { toolCallId: `t${i}`, toolName: "read", input: { path: "README.md" } });
      assert.equal(results.some((result) => result?.block), false);
      await harness.emit("tool_result", { toolCallId: `t${i}`, toolName: "read", input: { path: "README.md" }, content: [{ type: "text", text: "ok" }], isError: false });
    }

    const blocked = await harness.emit("tool_call", { toolCallId: "t3", toolName: "read", input: { path: "README.md" } });
    assert.equal(blocked.some((result) => result?.block), true);
    assert.match(blocked.find((result) => result?.block).reason, /repeated action/i);
  } finally {
    cleanup(cwd);
  }
});

test("applies strict and relaxed reliability profiles", async () => {
  const strictCwd = tempCwd();
  const relaxedCwd = tempCwd();
  try {
    mkdirSync(join(strictCwd, ".pi"), { recursive: true });
    writeFileSync(join(strictCwd, ".pi", "reliability.json"), JSON.stringify({ profile: "strict" }));
    const strictHarness = createHarness(strictCwd);
    await strictHarness.emit("session_start");
    await strictHarness.commands.get("reliability").handler("on strict repeat test", strictHarness.ctx);
    await strictHarness.emit("tool_call", { toolCallId: "s1", toolName: "read", input: { path: "README.md" } });
    await strictHarness.emit("tool_result", { toolCallId: "s1", toolName: "read", input: { path: "README.md" }, content: [{ type: "text", text: "ok" }], isError: false });
    const strictSecond = await strictHarness.emit("tool_call", { toolCallId: "s2", toolName: "read", input: { path: "README.md" } });
    assert.equal(strictSecond.some((result) => result?.block), true);
    await strictHarness.commands.get("reliability").handler("status", strictHarness.ctx);
    assert.match(strictHarness.notifications.at(-1).message, /Profile: strict/);

    mkdirSync(join(relaxedCwd, ".pi"), { recursive: true });
    writeFileSync(join(relaxedCwd, ".pi", "reliability.json"), JSON.stringify({ profile: "relaxed" }));
    const relaxedHarness = createHarness(relaxedCwd);
    await relaxedHarness.emit("session_start");
    await relaxedHarness.commands.get("reliability").handler("on relaxed repeat test", relaxedHarness.ctx);
    for (let i = 1; i <= 4; i++) {
      const results = await relaxedHarness.emit("tool_call", { toolCallId: `r${i}`, toolName: "read", input: { path: "README.md" } });
      assert.equal(results.some((result) => result?.block), false);
      await relaxedHarness.emit("tool_result", { toolCallId: `r${i}`, toolName: "read", input: { path: "README.md" }, content: [{ type: "text", text: "ok" }], isError: false });
    }
    await relaxedHarness.commands.get("reliability").handler("status", relaxedHarness.ctx);
    assert.match(relaxedHarness.notifications.at(-1).message, /Profile: relaxed/);
  } finally {
    cleanup(strictCwd);
    cleanup(relaxedCwd);
  }
});

test("builds compact and delta context headers", () => {
  const cwd = tempCwd();
  try {
    const compactConfig = normalizeConfig({ profile: "balanced", contextMode: "compact" });
    const deltaConfig = normalizeConfig({ profile: "balanced", contextMode: "delta" });
    const task = createTaskState(cwd, "implement reliability context compression", undefined, compactConfig);

    const compact = buildContextHeader(task, compactConfig);
    assert.match(compact.header, /Header mode: compact/);
    assert.ok(compact.header.length < buildContextHeader(task, normalizeConfig({ contextMode: "full" })).header.length);

    const firstDelta = buildContextHeader(task, deltaConfig);
    assert.match(firstDelta.header, /Initial context snapshot/);
    const secondDelta = buildContextHeader(task, deltaConfig, firstDelta.snapshot);
    assert.match(secondDelta.header, /No material reliability-state changes/);
    assert.ok(secondDelta.header.length <= firstDelta.header.length + 120);
  } finally {
    cleanup(cwd);
  }
});

test("verified complete task points at final plan step", () => {
  const cwd = tempCwd();
  try {
    const config = normalizeConfig({ profile: "balanced" });
    const task = createTaskState(cwd, "verify final pointer", undefined, config);
    addOrUpdateVerification(task, {
      criterion: task.success_criteria[0],
      status: "passed",
      evidence: "Unit test recorded explicit evidence.",
      source: "model",
      updated_at: new Date().toISOString(),
    });

    assert.equal(markTaskCompleteIfVerified(task), true);
    assert.equal(task.status, "complete");
    assert.equal(task.current_phase, "complete");
    assert.equal(task.current_step_id, "S4");
    assert.equal(task.plan.at(-1).status, "complete");
  } finally {
    cleanup(cwd);
  }
});

test("supervisor worker contract accepts current step result", async () => {
  const cwd = tempCwd();
  try {
    const harness = createHarness(cwd);
    await harness.emit("session_start");
    await harness.commands.get("reliability").handler("on supervisor worker split", harness.ctx);
    await harness.commands.get("reliability").handler("mode supervised", harness.ctx);
    await harness.emit("before_agent_start", { prompt: "supervisor worker split", systemPrompt: "sys" });

    const decision = await harness.tools.get("reliability_supervisor_decision").execute("tool", {}, undefined, undefined, harness.ctx);
    assert.match(decision.content[0].text, /SUPERVISOR \/ WORKER SPLIT/);
    const stepId = decision.details.decision.step_id;

    const result = await harness.tools.get("reliability_submit_worker_result").execute("tool", {
      step_id: stepId,
      action_taken: "Inspected task state",
      result: "Step completed",
      status: "complete",
      files_changed: ["README.md"],
      next_recommendation: "Continue next step",
    }, undefined, undefined, harness.ctx);

    assert.match(result.content[0].text, /Worker result accepted/);
    const [taskId] = taskIds(cwd);
    const state = JSON.parse(readFileSync(join(cwd, ".pi", "tasks", taskId, "state.json"), "utf8"));
    assert.ok(state.completed_steps.includes(stepId));
    assert.ok(state.files_touched.includes("README.md"));
  } finally {
    cleanup(cwd);
  }
});

test("worker result accepts step advanced by progress tool", async () => {
  const cwd = tempCwd();
  try {
    const harness = createHarness(cwd);
    await harness.emit("session_start");
    await harness.commands.get("reliability").handler("on create live-test.txt and verify", harness.ctx);
    await harness.commands.get("reliability").handler("mode supervised", harness.ctx);
    await harness.emit("before_agent_start", { prompt: "create live-test.txt and verify", systemPrompt: "sys" });

    await harness.tools.get("reliability_record_progress").execute("progress", {
      step_id: "S1",
      step_status: "complete",
      known_fact: "Task goal and success criteria are clear.",
    }, undefined, undefined, harness.ctx);

    const result = await harness.tools.get("reliability_submit_worker_result").execute("worker", {
      step_id: "S2",
      action_taken: "Created live-test.txt",
      result: "File contains ok.",
      status: "complete",
      files_changed: ["live-test.txt"],
      next_recommendation: "Verify by reading live-test.txt back.",
    }, undefined, undefined, harness.ctx);

    assert.match(result.content[0].text, /Worker result accepted for S2/);
    const [taskId] = taskIds(cwd);
    const state = JSON.parse(readFileSync(join(cwd, ".pi", "tasks", taskId, "state.json"), "utf8"));
    assert.ok(state.completed_steps.includes("S1"));
    assert.ok(state.completed_steps.includes("S2"));
  } finally {
    cleanup(cwd);
  }
});

test("blocks verification/report step completion until explicit evidence is recorded", async () => {
  const cwd = tempCwd();
  const goal = "Create live-test.txt containing exactly ok, then verify it by reading it back before final answer.";
  try {
    const harness = createHarness(cwd);
    await harness.emit("session_start");
    await harness.commands.get("reliability").handler(`on ${goal}`, harness.ctx);
    await harness.commands.get("reliability").handler("mode supervised", harness.ctx);
    await harness.emit("before_agent_start", { prompt: goal, systemPrompt: "sys" });

    await harness.tools.get("reliability_record_progress").execute("progress", {
      step_id: "S1",
      step_status: "complete",
      known_fact: "Task goal and success criteria are clear.",
    }, undefined, undefined, harness.ctx);

    await harness.tools.get("reliability_submit_worker_result").execute("worker-s2", {
      step_id: "S2",
      action_taken: "Created live-test.txt",
      result: "File contains ok.",
      status: "complete",
      files_changed: ["live-test.txt"],
      next_recommendation: "Read live-test.txt back to verify exact contents.",
    }, undefined, undefined, harness.ctx);

    await assert.rejects(
      harness.tools.get("reliability_verify_completion").execute("verify-missing-evidence", {}, undefined, undefined, harness.ctx),
      (error) => {
        assert.match(error.message, /Missing explicit verification evidence: 0 failed and 1 unknown verification criteria remain/);
        assert.doesNotMatch(error.message, /UNKNOWN:/);
        return true;
      },
    );

    await assert.rejects(
      harness.tools.get("reliability_submit_worker_result").execute("worker-s3-missing-evidence", {
        step_id: "S3",
        action_taken: "Read live-test.txt",
        result: "Read output was ok.",
        status: "complete",
      }, undefined, undefined, harness.ctx),
      (error) => {
        assert.match(error.message, /Cannot mark S3 complete while 0 failed and 1 unknown verification criteria remain/);
        assert.doesNotMatch(error.message, /UNKNOWN:/);
        return true;
      },
    );

    const verification = await harness.tools.get("reliability_verify_completion").execute("verify-paraphrased-evidence", {
      evidence: [{
        criterion: "live-test.txt was read",
        status: "passed",
        evidence: "Read live-test.txt returned exactly ok.",
      }],
    }, undefined, undefined, harness.ctx);
    assert.match(verification.content[0].text, /PASSED:/);
    assert.match(verification.content[0].text, new RegExp(goal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

    const s3 = await harness.tools.get("reliability_submit_worker_result").execute("worker-s3", {
      step_id: "S3",
      action_taken: "Recorded explicit verification evidence.",
      result: "Success criterion passed.",
      status: "complete",
      next_recommendation: "Report outcome to the user.",
    }, undefined, undefined, harness.ctx);
    assert.match(s3.content[0].text, /Worker result accepted for S3/);

    const s4 = await harness.tools.get("reliability_submit_worker_result").execute("worker-s4", {
      step_id: "S4",
      action_taken: "Prepared final report.",
      result: "Ready to summarize file creation and verification evidence.",
      status: "complete",
    }, undefined, undefined, harness.ctx);
    assert.match(s4.content[0].text, /Worker result accepted for S4/);
  } finally {
    cleanup(cwd);
  }
});

test("builds separate-model orchestration dry run and parses role JSON", async () => {
  const cwd = tempCwd();
  try {
    const config = normalizeConfig({ orchestrationMode: "separate-model", orchestrationModels: { worker: "test/worker" } });
    const state = createTaskState(cwd, "orchestrate task", undefined, config);
    const dryRun = buildDryRunOrchestration(state, config);
    assert.equal(dryRun.mode, "dry-run");
    assert.match(dryRun.prompts.supervisor, /reliability supervisor/i);
    assert.match(dryRun.prompts.worker, /worker contract/i);
    assert.match(dryRun.prompts.verifier, /reliability verifier/i);

    const worker = parseWorkerResultFromText('```json\n{"step_id":"S1","action_taken":"did it","result":"done","files_changed":["a.ts"],"errors":[],"status":"complete"}\n```');
    assert.equal(worker?.step_id, "S1");
    assert.equal(worker?.status, "complete");

    const evidence = parseVerificationEvidenceFromText('{"evidence":[{"criterion":"tests pass","status":"passed","evidence":"npm test passed"}]}');
    assert.equal(evidence?.[0]?.status, "passed");
  } finally {
    cleanup(cwd);
  }
});

test("orchestrate command is dry-run unless subprocess mode and --run are both enabled", async () => {
  const cwd = tempCwd();
  try {
    const harness = createHarness(cwd);
    await harness.emit("session_start");
    await harness.commands.get("reliability").handler("on orchestrate dry run", harness.ctx);
    await harness.emit("before_agent_start", { prompt: "orchestrate dry run", systemPrompt: "sys" });
    await harness.commands.get("reliability").handler("orchestrate", harness.ctx);
    assert.match(harness.notifications.at(-1).message, /Orchestration mode: dry-run/);
    assert.match(harness.notifications.at(-1).message, /orchestrationMode: prompt/);
  } finally {
    cleanup(cwd);
  }
});

test("offline reliability evaluation reports deterministic harness metrics", async () => {
  const cwd = tempCwd();
  try {
    const report = runOfflineReliabilityEvaluation(cwd);
    assert.equal(report.metrics.failed, 0);
    assert.equal(report.metrics.total, 5);
    assert.equal(report.metrics.false_completion_blocks, 1);
    assert.equal(report.metrics.repeated_action_blocks, 1);

    const harness = createHarness(cwd);
    await harness.emit("session_start");
    await harness.commands.get("reliability").handler("eval", harness.ctx);
    assert.match(harness.notifications.at(-1).message, /Reliability Harness Evaluation/);
    assert.equal(harness.notifications.at(-1).level, "success");
  } finally {
    cleanup(cwd);
  }
});

test("stores redacted raw tool logs only when enabled", async () => {
  const cwd = tempCwd();
  try {
    mkdirSync(join(cwd, ".pi"), { recursive: true });
    writeFileSync(join(cwd, ".pi", "reliability.json"), JSON.stringify({ storeRawToolLogs: true, rawLogMaxChars: 2000 }));
    const harness = createHarness(cwd);
    await harness.emit("session_start");
    await harness.commands.get("reliability").handler("on raw log storage", harness.ctx);
    await harness.emit("tool_call", { toolCallId: "raw1", toolName: "bash", input: { command: "npm test" } });
    await harness.emit("tool_result", {
      toolCallId: "raw1",
      toolName: "bash",
      input: { command: "npm test" },
      content: [{ type: "text", text: "token=supersecret\nBearer abcdefghijklmnop\nAKIA1234567890ABCDEF\n-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----" }],
      isError: false,
    });

    const [taskId] = taskIds(cwd);
    const state = JSON.parse(readFileSync(join(cwd, ".pi", "tasks", taskId, "state.json"), "utf8"));
    const rawLogPath = state.tool_history.at(-1).raw_log_path;
    assert.ok(rawLogPath);
    const log = readFileSync(join(cwd, rawLogPath), "utf8");
    assert.doesNotMatch(log, /supersecret|abcdefghijklmnop|AKIA1234567890ABCDEF|BEGIN PRIVATE KEY/);
    assert.match(log, /\[REDACTED/);
  } finally {
    cleanup(cwd);
  }
});

test("redacts and truncates raw logs", () => {
  assert.equal(redactSensitiveText("postgres://user:pass@example.test/db"), "postgres://[REDACTED]@example.test/db");
  const truncated = truncateRawLog(`sk-1234567890abcdef\n${"x".repeat(3000)}`, 1200);
  assert.match(truncated, /\[REDACTED_API_KEY\]/);
  assert.match(truncated, /RAW LOG TRUNCATED/);
  assert.ok(truncated.length < 1400);
});

test("strict profile queues completion-gate follow-up on unsupported completion claim", async () => {
  const cwd = tempCwd();
  try {
    mkdirSync(join(cwd, ".pi"), { recursive: true });
    writeFileSync(join(cwd, ".pi", "reliability.json"), JSON.stringify({ profile: "strict" }));
    const harness = createHarness(cwd);
    await harness.emit("session_start");
    await harness.commands.get("reliability").handler("on verify deployment is complete", harness.ctx);

    await harness.emit("message_end", {
      message: {
        role: "assistant",
        content: [{ type: "text", text: "Implemented and complete." }],
      },
    });

    assert.equal(harness.sentUserMessages.length, 1);
    assert.match(harness.sentUserMessages[0].content, /Reliability completion gate triggered/);
    assert.equal(harness.sentUserMessages[0].options.deliverAs, "followUp");
    assert.equal(harness.notifications.at(-1).level, "error");
  } finally {
    cleanup(cwd);
  }
});


test("suggests verification commands from project manifests", async () => {
  const cwd = tempCwd();
  try {
    writeFileSync(join(cwd, "package.json"), JSON.stringify({ scripts: { test: "vitest", check: "tsc --noEmit" } }, null, 2));
    const harness = createHarness(cwd);
    await harness.emit("session_start");

    const result = await harness.tools.get("reliability_suggest_verification").execute("tool", {}, undefined, undefined, harness.ctx);
    assert.match(result.content[0].text, /npm test/);
    assert.match(result.content[0].text, /npm run check/);
  } finally {
    cleanup(cwd);
  }
});

test("parses common verification outputs", () => {
  assert.deepEqual(
    parseVerificationResult("npx tsc --noEmit", "src/app.ts(1,1): error TS2322: Type 'x' is not assignable", true).counts,
    { errors: 1 },
  );
  assert.equal(parseVerificationResult("pytest", "==== 2 failed, 3 passed in 1.23s ====", true).status, "failed");
  assert.equal(parseVerificationResult("cargo test", "test result: ok. 10 passed; 0 failed; 0 ignored", false).status, "passed");
  assert.equal(parseVerificationResult("go test ./...", "FAIL\t./pkg\n", true).status, "failed");
  assert.equal(parseVerificationResult("./gradlew test", "BUILD SUCCESSFUL in 3s", false).status, "passed");
});

test("records failed verification commands against verification criteria", async () => {
  const cwd = tempCwd();
  try {
    const harness = createHarness(cwd);
    await harness.emit("session_start");
    await harness.commands.get("reliability").handler("on verify tests work", harness.ctx);

    await harness.emit("tool_call", { toolCallId: "bash1", toolName: "bash", input: { command: "npm test" } });
    await harness.emit("tool_result", {
      toolCallId: "bash1",
      toolName: "bash",
      input: { command: "npm test" },
      content: [{ type: "text", text: "Tests failed" }],
      isError: true,
    });

    await harness.commands.get("reliability").handler("verify", harness.ctx);
    assert.match(harness.notifications.at(-1).message, /FAILED: verify tests work/i);
  } finally {
    cleanup(cwd);
  }
});

test("lists, resumes, and archives tasks", async () => {
  const cwd = tempCwd();
  try {
    const harness = createHarness(cwd);
    await harness.emit("session_start");
    await harness.commands.get("reliability").handler("on first task", harness.ctx);
    await harness.commands.get("reliability").handler("on second task", harness.ctx);

    const ids = taskIds(cwd);
    assert.equal(ids.length, 2);

    await harness.commands.get("reliability").handler("tasks", harness.ctx);
    assert.match(harness.notifications.at(-1).message, /first task|second task/);

    await harness.commands.get("reliability").handler(`archive ${ids[0].slice(0, 8)}`, harness.ctx);
    assert.equal(harness.notifications.at(-1).level, "info");

    await harness.commands.get("reliability").handler("tasks", harness.ctx);
    assert.doesNotMatch(harness.notifications.at(-1).message, new RegExp(ids[0].slice(0, 8)));

    await harness.commands.get("reliability").handler(`resume ${ids[1].slice(0, 8)}`, harness.ctx);
    assert.match(harness.notifications.at(-1).message, /Resumed reliability task/);
  } finally {
    cleanup(cwd);
  }
});
