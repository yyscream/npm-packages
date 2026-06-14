import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import workflowTestExtension from "../dev/workflow-test-extension.ts";
import { formatWorkflowSelfTestReport, runWorkflowSelfTest } from "../dev/workflow-test.ts";
import { createWorkflowStateStore } from "../src/state.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const result = await runWorkflowSelfTest({
  extensionDir: root,
  parentCwd: process.cwd(),
  ctx: { hasUI: false },
  state: createWorkflowStateStore(),
});

assert.equal(result.verdict, "PASS");
assert.equal(result.run.status, "completed");
assert.match(formatWorkflowSelfTestReport(result), /SELF_TEST_SYNTHESIS_OK/);

const commands = [];
const handlers = new Map();
const events = [];
workflowTestExtension({
  registerCommand(name, definition) {
    commands.push(name);
    handlers.set(name, definition.handler);
  },
  registerTool() {},
  on(name) {
    events.push(name);
  },
  appendEntry() {},
});

assert.deepEqual(commands, ["workflow-test"]);
assert.deepEqual(events, ["session_shutdown"]);

const notifications = [];
await handlers.get("workflow-test")("", {
  cwd: process.cwd(),
  hasUI: true,
  ui: {
    notify(message, level) {
      notifications.push({ message, level });
    },
    setStatus() {},
    setWidget() {},
  },
});

const report = notifications.find((entry) => String(entry.message).includes("# Workflow Self-Test Report"));
assert.equal(report.level, "success");
assert.match(report.message, /Verdict: PASS/);

console.log("workflow-test tests passed");
