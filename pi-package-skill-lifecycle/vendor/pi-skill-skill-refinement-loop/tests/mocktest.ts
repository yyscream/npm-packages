import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const packageRoot = path.resolve(import.meta.dir, "..");
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "pi-skill-refinement-test-"));
const agentDir = path.join(tempRoot, "agent");
process.env.PI_CODING_AGENT_DIR = agentDir;

const { default: extension } = await import("../extensions/skill-refinement.ts");

type ToolDef = { name: string; execute: (_id: string, params: any, signal?: AbortSignal, onUpdate?: any, ctx?: any) => Promise<any> };
const tools = new Map<string, ToolDef>();

extension({
  registerTool(tool: ToolDef) {
    tools.set(tool.name, tool);
  },
} as any);

assert.deepEqual([...tools.keys()], ["skill_refinement_plan"]);

const tool = tools.get("skill_refinement_plan")!;
const outputPath = path.join(tempRoot, "repo-explorer-refinement.md");
const ctx = { cwd: packageRoot };

const result = await tool.execute(
  "1",
  {
    skill: "repo-explorer",
    failure: "The skill should have used includeEvidence=true because exact code citations were requested.",
    evidence: ["User correction after compact output omitted exact snippets."],
    rootCauseHypothesis: "The workflow does not explicitly escalate evidence mode for citation-heavy prompts.",
    patchSummary: "Require includeEvidence=true when exact code citations are requested.",
    regressionTest: "Add a contract fixture for citation-heavy prompts.",
    verificationSteps: ["bun tests/mocktest.ts"],
    outputPath,
  },
  undefined,
  undefined,
  ctx,
);

assert.equal(result.details.skill, "repo-explorer");
assert.equal(result.details.skillSlug, "repo-explorer");
assert.equal(result.details.outputPath, outputPath);
assert.equal(result.details.memoryUpdated, true);
assert.equal(result.details.dryRun, false);
assert(result.content[0].text.includes("Skill refinement proposal for repo-explorer"));

const proposal = await readFile(outputPath, "utf8");
assert.match(proposal, /^# PATCH\.md — Refine repo-explorer skill/m);
assert.match(proposal, /## Purpose/);
assert.match(proposal, /### Root cause/);
assert.match(proposal, /## Scope \(exact files changed\)/);
assert.match(proposal, /## Change 1 — Record the failure pattern in per-skill memory/);
assert.match(proposal, /## Verification steps/);
assert.match(proposal, /includeEvidence=true/);
assert.match(proposal, /Task 2\/Task 3 fallback/);

const memoryFile = path.join(agentDir, "memory", "skills", "repo-explorer.md");
const memory = await readFile(memoryFile, "utf8");
assert.match(memory, /Failure\/correction: The skill should have used includeEvidence=true/);
assert.match(memory, /Proposed refinement: Require includeEvidence=true/);
assert.match(memory, /Evidence:/);

await assert.rejects(
  () => tool.execute("2", { skill: "repo-explorer", failure: "same", outputPath }, undefined, undefined, ctx),
  /Refusing to overwrite existing proposal/,
);

const dryRunOutput = path.join(tempRoot, "dry-run.md");
const dryRun = await tool.execute(
  "3",
  {
    skill: "repo-explorer",
    failure: "Preview only",
    outputPath: dryRunOutput,
    dryRun: true,
  },
  undefined,
  undefined,
  ctx,
);
assert.equal(dryRun.details.dryRun, true);
assert.equal(dryRun.details.memoryUpdated, false);
assert.match(dryRun.content[0].text, /dry-run: memory not written/);
await assert.rejects(() => readFile(dryRunOutput, "utf8"));

await rm(tempRoot, { recursive: true, force: true });
console.log("skill refinement loop mock tests passed");
