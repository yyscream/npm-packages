import { access, appendFile, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { getAgentDir, slugify } from "@firstpick/pi-utils";
import { Type } from "typebox";

const SkillRefinementPlanParams = Type.Object({
  skill: Type.String({ description: "Skill name involved in the failed invocation or user correction." }),
  failure: Type.String({ description: "Short description of the correction, failed test, or observed skill failure." }),
  evidence: Type.Optional(Type.Array(Type.String({ description: "Concrete evidence such as user quote, failing command, file path, or test output." }))),
  rootCauseHypothesis: Type.Optional(Type.String({ description: "Likely reason the skill failed. If omitted, the tool records that this needs investigation." })),
  patchSummary: Type.Optional(Type.String({ description: "High-level source change proposed for the skill." })),
  regressionTest: Type.Optional(Type.String({ description: "Regression/routing test proposal, or why a test is not applicable." })),
  verificationSteps: Type.Optional(Type.Array(Type.String({ description: "Commands or manual checks to run before applying the refinement." }))),
  skillPackagePath: Type.Optional(Type.String({ description: "Optional skill package root, skill directory, or SKILL.md path. Leading @ is normalized." })),
  outputPath: Type.Optional(Type.String({ description: "Optional output path for the PATCH.md-style proposal. Defaults to a unique /tmp file. Leading @ is normalized." })),
  overwrite: Type.Optional(Type.Boolean({ description: "Allow overwriting outputPath if it already exists. Defaults to false." })),
  writeMemory: Type.Optional(Type.Boolean({ description: "Append the failure pattern to ~/.pi/agent/memory/skills/<skill>.md. Defaults to true." })),
  dryRun: Type.Optional(Type.Boolean({ description: "If true, return the proposal without writing memory or output files." })),
});

type SkillLocation = {
  skillPath?: string;
  packageRoot?: string;
};

type ProposalInput = {
  skill: string;
  skillSlug: string;
  failure: string;
  evidence: string[];
  rootCauseHypothesis?: string;
  patchSummary?: string;
  regressionTest?: string;
  verificationSteps: string[];
  outputPath: string;
  memoryFile: string;
  memoryWillBeWritten: boolean;
  dryRun: boolean;
  location: SkillLocation;
  evaluatorAvailable: boolean;
};

function trimRequired(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} must be a non-empty string`);
  return trimmed;
}

function stripAtPrefix(value: string): string {
  return value.startsWith("@") ? value.slice(1) : value;
}

function expandHome(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith(`~${path.sep}`) || value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

function resolvePathArg(raw: string, cwd: string): string {
  const cleaned = expandHome(stripAtPrefix(raw.trim()));
  return path.isAbsolute(cleaned) ? path.normalize(cleaned) : path.resolve(cwd, cleaned);
}

function safeTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function utcHeading(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function uniqueTmpProposalPath(skillSlug: string): string {
  return path.join(os.tmpdir(), `skill-refinement-${skillSlug}-${safeTimestamp()}.md`);
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function firstExisting(paths: string[]): Promise<string | undefined> {
  for (const candidate of paths) {
    if (await exists(candidate)) return candidate;
  }
  return undefined;
}

function inferPackageRoot(skillPath: string): string | undefined {
  const skillDir = path.dirname(skillPath);
  const maybeSkillsDir = path.dirname(skillDir);
  if (path.basename(maybeSkillsDir) === "skills") return path.dirname(maybeSkillsDir);
  return undefined;
}

async function resolveSkillLocation(skill: string, skillSlug: string, cwd: string, skillPackagePath?: string): Promise<SkillLocation> {
  const names = [...new Set([skill, skillSlug].filter(Boolean))];

  if (skillPackagePath) {
    const resolved = resolvePathArg(skillPackagePath, cwd);
    const packageCandidates = [
      resolved.endsWith("SKILL.md") ? resolved : path.join(resolved, "SKILL.md"),
      ...names.map((name) => path.join(resolved, "skills", name, "SKILL.md")),
      ...names.map((name) => path.join(resolved, name, "SKILL.md")),
    ];
    const skillPath = await firstExisting(packageCandidates);
    if (skillPath) {
      const realSkillPath = await realpath(skillPath).catch(() => skillPath);
      return { skillPath: realSkillPath, packageRoot: inferPackageRoot(realSkillPath) ?? resolved };
    }
    return { packageRoot: resolved };
  }

  const agentSkillsDir = path.join(getAgentDir(), "skills");
  const agentCandidates = [
    ...names.map((name) => path.join(agentSkillsDir, name, "SKILL.md")),
    ...names.map((name) => path.join(agentSkillsDir, `${name}.md`)),
  ];
  const skillPath = await firstExisting(agentCandidates);
  if (!skillPath) return {};

  const realSkillPath = await realpath(skillPath).catch(() => skillPath);
  return { skillPath: realSkillPath, packageRoot: inferPackageRoot(realSkillPath) };
}

async function commandOnPath(command: string): Promise<boolean> {
  const pathEnv = process.env.PATH ?? "";
  for (const dir of pathEnv.split(path.delimiter).filter(Boolean)) {
    const candidate = path.join(dir, command);
    if (await exists(candidate)) return true;
  }
  return false;
}

function bulletList(items: string[], fallback: string): string {
  const clean = items.map((item) => item.trim()).filter(Boolean);
  if (clean.length === 0) return `- ${fallback}`;
  return clean.map((item) => `- ${item}`).join("\n");
}

function numberedList(items: string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function proposedScope(input: ProposalInput): string[] {
  const files: string[] = [];
  if (input.location.skillPath) files.push(input.location.skillPath);
  else if (input.location.packageRoot) files.push(path.join(input.location.packageRoot, "skills", input.skillSlug, "SKILL.md"));
  else files.push(`skills/${input.skillSlug}/SKILL.md (resolve actual package path before applying)`);

  const packageRoot = input.location.packageRoot;
  if (packageRoot) {
    files.push(path.join(packageRoot, "skills", input.skillSlug, "tests", `test_${input.skillSlug.replace(/-/g, "_")}.py`));
    files.push(path.join(packageRoot, "PATCH.md"));
  } else {
    files.push(`skills/${input.skillSlug}/tests/ or tests/routing/${input.skillSlug}.json (proposed regression test location)`);
    files.push("PATCH.md or /tmp/skill-refinement-<skill>.md (proposal only)");
  }
  files.push(input.memoryFile);
  return [...new Set(files)];
}

function defaultPatchSummary(skill: string): string {
  return `Refine the ${skill} skill instructions and/or tests so this failure pattern is handled explicitly before the skill is used again.`;
}

function defaultRegressionTest(skill: string, failure: string): string {
  return `Add a regression fixture for ${skill} covering: ${failure}. If this is a routing issue, add should-trigger/should-not-trigger prompt examples; if it is a workflow issue, add a contract test that checks the required instruction or safety gate is present.`;
}

function buildProposal(input: ProposalInput): string {
  const scope = proposedScope(input);
  const rootCause = input.rootCauseHypothesis?.trim() || "Needs investigation; current evidence is sufficient to justify a refinement proposal but not yet enough to assert a final root cause.";
  const patchSummary = input.patchSummary?.trim() || defaultPatchSummary(input.skill);
  const regressionTest = input.regressionTest?.trim() || defaultRegressionTest(input.skill, input.failure);
  const evaluatorStep = input.evaluatorAvailable
    ? `Run skill_eval_run ${input.location.skillPath ?? path.join(input.location.packageRoot ?? "<skill-package>", "skills", input.skillSlug, "SKILL.md")}`
    : "Run the skill evaluator if Task 3 is installed; otherwise run the package's available tests and manually review routing/contract expectations.";
  const verificationSteps = [...input.verificationSteps, evaluatorStep];

  return `# PATCH.md — Refine ${input.skill} skill\n\n## Purpose\n\nCreate a reviewable refinement proposal from a failed skill invocation, user correction, or test failure. This proposal is intentionally non-destructive: it records evidence, proposes source/test changes, and requires validation plus user approval before changing production skill behavior.\n\n### Root cause\n\n${rootCause}\n\n### Expected outcome\n\nThe ${input.skill} skill handles the observed failure pattern reliably, preserves its safety boundaries, and has a regression check or explicit rationale when a test is not applicable.\n\n## Scope (exact files changed)\n\nPath variables:\n\n- \`<skill-package>\` = ${input.location.packageRoot ?? "resolve from the enabled skill symlink or package settings before applying"}\n- \`<skill-memory>\` = ${input.memoryFile}\n\nThis proposal may affect these files when applied:\n\n${bulletList(scope, "Resolve scope before applying the patch.")}\n\n## Change 1 — Record the failure pattern in per-skill memory\n\n**File:** ${input.memoryFile}\n\n### What was changed\n\n${input.memoryWillBeWritten && !input.dryRun ? "The tool appended" : "Append"} a timestamped entry describing the failure/correction, evidence, root cause hypothesis, and proposal file path.\n\n### Why\n\nPer-skill memory prevents the same failure from being rediscovered and gives future invocations a concise historical hint without dirtying reusable package directories.\n\n## Change 2 — Refine skill workflow or routing instructions\n\n**File:** ${input.location.skillPath ?? path.join(input.location.packageRoot ?? "<skill-package>", "skills", input.skillSlug, "SKILL.md")}\n\n### What was changed\n\nProposed change: ${patchSummary}\n\n### Why\n\nThe observed failure indicates the skill's trigger, workflow, verification, or safety guidance is incomplete for this scenario.\n\n## Change 3 — Add or update a regression check\n\n**File:** ${input.location.packageRoot ? path.join(input.location.packageRoot, "skills", input.skillSlug, "tests", `test_${input.skillSlug.replace(/-/g, "_")}.py`) : `tests/routing/${input.skillSlug}.json or skills/${input.skillSlug}/tests/`}\n\n### What was changed\n\nRegression test proposal: ${regressionTest}\n\n### Why\n\nThe refinement should be measurable. If automation is impossible, the proposal must explicitly document why and include a manual verification step.\n\n## Verification steps\n\n${numberedList(verificationSteps)}\n\n## Operational notes\n\n- Evidence:\n${bulletList(input.evidence, "No extra evidence supplied beyond the failure description.")}\n- Failure/correction: ${input.failure}\n- Output proposal path: ${input.outputPath}\n- Do not apply source changes automatically. Apply only after reviewing this proposal, adding/updating the regression check, and getting user approval for risky changes.\n- Task 2/Task 3 fallback: this package writes per-skill memory directly and treats \`skill_eval_run\` as optional until the dedicated memory/evaluator packages exist.\n`;
}

function buildMemoryEntry(input: ProposalInput): string {
  const rootCause = input.rootCauseHypothesis?.trim() || "Needs investigation.";
  const patchSummary = input.patchSummary?.trim() || defaultPatchSummary(input.skill);
  const evidence = input.evidence.map((item) => item.trim()).filter(Boolean);
  const evidenceText = evidence.length ? evidence.map((item) => `  - ${item}`).join("\n") : "  - No extra evidence supplied.";

  return `\n## ${utcHeading()}\n- Failure/correction: ${input.failure}\n- Root cause hypothesis: ${rootCause}\n- Proposed refinement: ${patchSummary}\n- Regression check: ${(input.regressionTest?.trim() || defaultRegressionTest(input.skill, input.failure)).replace(/\n/g, " ")}\n- Proposal: ${input.outputPath}\n- Evidence:\n${evidenceText}\n`;
}

async function appendQueued(file: string, content: string): Promise<void> {
  await withFileMutationQueue(file, async () => {
    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, content, "utf8");
  });
}

async function writeQueued(file: string, content: string, overwrite: boolean): Promise<void> {
  await withFileMutationQueue(file, async () => {
    await mkdir(path.dirname(file), { recursive: true });
    if (!overwrite && (await exists(file))) {
      throw new Error(`Refusing to overwrite existing proposal: ${file}. Pass overwrite=true or choose another outputPath.`);
    }
    await writeFile(file, content, "utf8");
  });
}

async function readSnippet(file: string, maxChars = 12_000): Promise<string> {
  const content = await readFile(file, "utf8");
  if (content.length <= maxChars) return content;
  return `${content.slice(0, maxChars)}\n\n[Proposal truncated in tool output; full file: ${file}]`;
}

export default function skillRefinementLoop(pi: ExtensionAPI) {
  pi.registerTool({
    name: "skill_refinement_plan",
    label: "Skill Refinement Plan",
    description: "Create a non-destructive skill refinement plan from a failed skill invocation or user correction. Appends per-skill memory and writes a PATCH.md-style proposal; output is capped at 12000 characters.",
    promptSnippet: "Create a read-only skill refinement plan from a user correction or skill/test failure.",
    promptGuidelines: [
      "Use skill_refinement_plan when a user correction, failed test, or observed runtime behavior shows that a Pi skill should be improved; do not use it for ordinary application bugs unless a skill itself failed.",
      "skill_refinement_plan writes only per-skill memory and a proposal file; it must not be treated as approval to edit production skill behavior.",
    ],
    parameters: SkillRefinementPlanParams,

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const skill = trimRequired(params.skill, "skill");
      const failure = trimRequired(params.failure, "failure");
      const skillSlug = slugify(skill, { fallback: "skill" });
      const evidence = (params.evidence ?? []).map((item) => item.trim()).filter(Boolean);
      const dryRun = params.dryRun === true;
      const writeMemory = params.writeMemory !== false;
      const memoryFile = path.join(getAgentDir(), "memory", "skills", `${skillSlug}.md`);
      const outputPath = params.outputPath
        ? resolvePathArg(params.outputPath, ctx.cwd)
        : uniqueTmpProposalPath(skillSlug);
      const location = await resolveSkillLocation(skill, skillSlug, ctx.cwd, params.skillPackagePath);
      const evaluatorAvailable = await commandOnPath("skill_eval_run");
      const input: ProposalInput = {
        skill,
        skillSlug,
        failure,
        evidence,
        rootCauseHypothesis: params.rootCauseHypothesis,
        patchSummary: params.patchSummary,
        regressionTest: params.regressionTest,
        verificationSteps: (params.verificationSteps ?? []).map((item) => item.trim()).filter(Boolean),
        outputPath,
        memoryFile,
        memoryWillBeWritten: writeMemory,
        dryRun,
        location,
        evaluatorAvailable,
      };

      const proposal = buildProposal(input);
      const memoryEntry = buildMemoryEntry(input);

      if (!dryRun) {
        if (writeMemory) await appendQueued(memoryFile, memoryEntry);
        await writeQueued(outputPath, proposal, params.overwrite === true);
      }

      const visibleProposal = dryRun ? proposal.slice(0, 12_000) : await readSnippet(outputPath);
      const memoryStatus = dryRun
        ? "dry-run: memory not written"
        : writeMemory
          ? `memory updated: ${memoryFile}`
          : "memory update skipped by writeMemory=false";

      return {
        content: [
          {
            type: "text",
            text: `Skill refinement proposal for ${skill}\n${memoryStatus}\nproposal: ${outputPath}\n\n${visibleProposal}`,
          },
        ],
        details: {
          skill,
          skillSlug,
          failure,
          evidence,
          outputPath,
          memoryFile,
          memoryUpdated: !dryRun && writeMemory,
          dryRun,
          skillPath: location.skillPath,
          packageRoot: location.packageRoot,
          evaluatorAvailable,
          proposedScope: proposedScope(input),
        },
      };
    },
  });
}
