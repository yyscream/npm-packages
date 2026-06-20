import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import reliabilityHarnessExtension from "../index.ts";
import { buildContextHeader, createTaskState, normalizeConfig, parseVerificationResult, redactSensitiveText, runOfflineReliabilityEvaluation, truncateRawLog } from "../src/core.ts";
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

  return { commands, tools, emit, ctx, entries, notifications, sentUserMessages, statuses, widgets };
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
    assert.match(JSON.stringify(injectedMessages.at(-1)), /RELIABILITY HARNESS ACTIVE/);

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

test("supervisor worker contract accepts current step result", async () => {
  const cwd = tempCwd();
  try {
    const harness = createHarness(cwd);
    await harness.emit("session_start");
    await harness.commands.get("reliability").handler("on supervisor worker split", harness.ctx);
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
