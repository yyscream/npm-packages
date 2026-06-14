import assert from "node:assert/strict";
import { runWorkflow } from "../src/runner.ts";
import { createWorkflowStateStore } from "../src/state.ts";

function source(definition) {
  return { path: "/tmp/workflow.json", scope: "bundled", definition };
}

function baseDefinition() {
  return {
    schemaVersion: 1,
    key: "runner-test",
    name: "Runner Test",
    defaults: { maxConcurrency: 2, maxTasks: 10 },
    phases: [
      {
        id: "parallel",
        name: "Parallel",
        mode: "parallel",
        maxConcurrency: 2,
        tasks: [
          { id: "a", name: "A", prompt: "A {{topic}}" },
          { id: "b", name: "B", prompt: "B {{topic}}" },
          { id: "c", name: "C", prompt: "C {{topic}}" },
        ],
      },
      {
        id: "synthesis",
        name: "Synthesis",
        mode: "sequential",
        tasks: [{ id: "summary", name: "Summary", prompt: "Summarize {{topic}}" }],
      },
    ],
  };
}

const persisted = [];
const state = createWorkflowStateStore({ appendEntry: (_type, data) => persisted.push(data) });
const started = [];
let active = 0;
let maxActive = 0;
const taskRunner = {
  async runTask(task) {
    active++;
    maxActive = Math.max(maxActive, active);
    started.push(task.id);
    await new Promise((resolve) => setTimeout(resolve, task.id === "a" ? 20 : 5));
    active--;
    return { ok: true, output: `output:${task.id}:${task.prompt.includes("demo")}` };
  },
};

const run = await runWorkflow(source(baseDefinition()), { topic: "demo" }, { hasUI: false }, {
  cwd: process.cwd(),
  taskRunner,
  state,
});

assert.equal(run.status, "completed");
assert.equal(run.phases[0].status, "completed");
assert.equal(run.phases[1].tasks[0].status, "completed");
assert.equal(maxActive, 2, "parallel phase should respect configured concurrency");
assert.deepEqual(run.phases[0].tasks.map((task) => task.taskId), ["a", "b", "c"], "parallel result order should remain stable");
assert.ok(run.summary.includes("Workflow Run Summary"));
assert.ok(persisted.length > 0, "runner should persist state transitions");

const failingDefinition = baseDefinition();
failingDefinition.phases = [
  {
    id: "single",
    name: "Single",
    mode: "sequential",
    tasks: [{ id: "fail", name: "Fail", prompt: "fail" }],
  },
];

const failingRun = await runWorkflow(source(failingDefinition), {}, { hasUI: false }, {
  cwd: process.cwd(),
  taskRunner: {
    async runTask() {
      return { ok: false, output: "bad", error: "expected failure" };
    },
  },
  state: createWorkflowStateStore(),
});

assert.equal(failingRun.status, "failed");
assert.equal(failingRun.phases[0].tasks[0].status, "failed");
assert.match(failingRun.error, /expected failure/);

console.log("runner tests passed");
