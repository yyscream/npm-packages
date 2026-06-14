import assert from "node:assert/strict";
import workflowExtension from "../index.ts";

const commands = [];
const commandHandlers = new Map();
const tools = [];
const events = [];

workflowExtension({
  registerCommand(name, definition) {
    commands.push(name);
    commandHandlers.set(name, definition.handler);
  },
  registerTool(definition) {
    tools.push(definition.name);
  },
  on(name) {
    events.push(name);
  },
  appendEntry() {},
});

assert.deepEqual(commands, ["workflow", "workflow-clear"]);
assert.equal(commands.includes("workflow-test"), false, "production extension must not publish/register /workflow-test");
assert.deepEqual(tools, ["workflow_run", "workflow_status"]);
assert.deepEqual(events, ["session_start", "session_shutdown"]);

const notifications = [];
await commandHandlers.get("workflow")("list", {
  cwd: process.cwd(),
  hasUI: true,
  isProjectTrusted: () => false,
  ui: {
    notify(message, level) {
      notifications.push({ message, level });
    },
    setStatus() {},
    setWidget() {},
  },
});

assert.equal(notifications.at(-1).level, "info");
assert.match(notifications.at(-1).message, /deep-research-minimal/);

console.log("extension tests passed");
