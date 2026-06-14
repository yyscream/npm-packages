import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WorkflowValidationError } from "../src/errors.ts";
import { HARD_MAX_CONCURRENCY, validateWorkflowDefinition } from "../src/schema.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = join(root, "tests", "fixtures", "simple-workflow.json");
const valid = JSON.parse(await readFile(fixturePath, "utf8"));

const parsed = validateWorkflowDefinition(valid);
assert.equal(parsed.key, "simple-workflow");
assert.equal(parsed.phases[0].tasks[0].id, "one");

assert.throws(
  () => validateWorkflowDefinition({ ...valid, key: "" }),
  (error) => error instanceof WorkflowValidationError && error.issues.some((issue) => issue.includes("key must be")),
);

assert.throws(
  () => validateWorkflowDefinition({ ...valid, phases: [] }),
  (error) => error instanceof WorkflowValidationError && error.issues.some((issue) => issue.includes("phases must contain")),
);

const duplicateTasks = structuredClone(valid);
duplicateTasks.phases[0].tasks.push({ ...duplicateTasks.phases[0].tasks[0], name: "Duplicate" });
assert.throws(
  () => validateWorkflowDefinition(duplicateTasks),
  (error) => error instanceof WorkflowValidationError && error.issues.some((issue) => issue.includes("duplicated within phase")),
);

const invalidConcurrency = structuredClone(valid);
invalidConcurrency.phases[0].maxConcurrency = HARD_MAX_CONCURRENCY + 1;
assert.throws(
  () => validateWorkflowDefinition(invalidConcurrency),
  (error) => error instanceof WorkflowValidationError && error.issues.some((issue) => issue.includes(`<= ${HARD_MAX_CONCURRENCY}`)),
);

const unsafeTools = structuredClone(valid);
unsafeTools.phases[0].tasks[0].tools = ["read", "write"];
assert.throws(
  () => validateWorkflowDefinition(unsafeTools),
  (error) => error instanceof WorkflowValidationError && error.issues.some((issue) => issue.includes("not allowed")),
);

console.log("schema tests passed");
