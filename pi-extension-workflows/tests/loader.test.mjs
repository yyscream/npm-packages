import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path, { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WorkflowLoadError } from "../src/errors.ts";
import { findWorkflowSource, loadWorkflowRegistry } from "../src/loader.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const temp = await mkdtemp(path.join(os.tmpdir(), "pi-workflows-loader-test-"));

try {
  const bundledOnly = await loadWorkflowRegistry({ cwd: temp, extensionDir: root, includeProject: true, projectTrusted: false });
  assert.ok(findWorkflowSource(bundledOnly, "deep-research-minimal"));
  assert.equal(findWorkflowSource(bundledOnly, "project-only"), undefined);

  await mkdir(path.join(temp, ".pi", "workflows"), { recursive: true });
  await writeFile(path.join(temp, ".pi", "workflows", "project-only.json"), JSON.stringify({
    schemaVersion: 1,
    key: "project-only",
    name: "Project Only",
    phases: [
      {
        id: "phase",
        name: "Phase",
        mode: "sequential",
        tasks: [{ id: "task", name: "Task", prompt: "Do it", tools: ["read"] }],
      },
    ],
  }));

  const trusted = await loadWorkflowRegistry({ cwd: temp, extensionDir: root, includeProject: true, projectTrusted: true });
  assert.ok(findWorkflowSource(trusted, "project-only"));

  await writeFile(path.join(temp, ".pi", "workflows", "duplicate.json"), JSON.stringify({
    schemaVersion: 1,
    key: "deep-research-minimal",
    name: "Duplicate",
    phases: [
      {
        id: "phase",
        name: "Phase",
        mode: "sequential",
        tasks: [{ id: "task", name: "Task", prompt: "Do it", tools: ["read"] }],
      },
    ],
  }));

  await assert.rejects(
    () => loadWorkflowRegistry({ cwd: temp, extensionDir: root, includeProject: true, projectTrusted: true }),
    (error) => error instanceof WorkflowLoadError && error.issues.some((issue) => issue.includes("duplicate workflow key")),
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}

console.log("loader tests passed");
