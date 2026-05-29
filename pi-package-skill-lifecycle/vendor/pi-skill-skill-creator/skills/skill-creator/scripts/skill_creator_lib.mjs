import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";

const VALID_REUSABILITY = new Set(["repeated-3-plus", "expensive", "strategic-reuse", "confirmed"]);
const BLOCKED_REUSABILITY = new Set(["unknown", "one-off", "not-reusable"]);
const PRIVATE_PATH_RE = /(?:\/home\/[A-Za-z0-9._-]+|\/Users\/[A-Za-z0-9._-]+)/g;

export function getAgentDir() {
  const configured = process.env.PI_CODING_AGENT_DIR?.trim();
  return configured ? path.resolve(expandTilde(configured)) : path.join(os.homedir(), ".pi", "agent");
}

export function expandTilde(input) {
  if (!input) return input;
  if (input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

export function resolveUserPath(input, cwd = process.cwd()) {
  const cleaned = String(input ?? "").trim().replace(/^@+/, "");
  if (!cleaned) return "";
  const expanded = expandTilde(cleaned);
  return path.isAbsolute(expanded) ? path.resolve(expanded) : path.resolve(cwd, expanded);
}

function pathIsInside(child, parent) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

export function isDiscoveredSkillPath(candidatePath) {
  return pathIsInside(candidatePath, path.join(getAgentDir(), "skills"));
}

export function slugifySkillName(input) {
  const slug = String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) throw new Error("Skill name cannot be empty after normalization.");
  if (slug.length > 64) throw new Error(`Skill name exceeds 64 characters after normalization: ${slug}`);
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) || slug.includes("--")) {
    throw new Error(`Invalid Agent Skills name after normalization: ${slug}`);
  }
  return slug;
}

function titleFromName(name) {
  return name
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function yamlString(value) {
  return JSON.stringify(String(value ?? "").replace(/\s+/g, " ").trim());
}

function sentence(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

export function sanitizePrivatePaths(text, { localOnly = false } = {}) {
  const warnings = [];
  let sanitized = String(text ?? "");
  const home = os.homedir();
  if (home && sanitized.includes(home)) {
    sanitized = sanitized.split(home).join("~");
    warnings.push("Replaced the current user's home path with '~'.");
  }
  const matches = sanitized.match(PRIVATE_PATH_RE) ?? [];
  if (matches.length > 0) {
    sanitized = sanitized.replace(PRIVATE_PATH_RE, "~");
    warnings.push("Replaced private-looking home paths with '~'.");
  }
  if (localOnly && warnings.length > 0) {
    warnings.push("Draft marked local-only because path-sensitive source material was supplied.");
  }
  return { text: sanitized, warnings: [...new Set(warnings)] };
}

function stripMarkdownPrefix(line) {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
}

function usefulLine(line) {
  const cleaned = stripMarkdownPrefix(line);
  if (!cleaned) return "";
  if (/^```/.test(cleaned)) return "";
  if (/^\|/.test(cleaned)) return "";
  if (/^(situation|successful procedure|verification|reusability evidence|notes?)$/i.test(cleaned)) return "";
  return cleaned;
}

export function extractProcedure(sourceText) {
  const lines = String(sourceText ?? "").split(/\r?\n/);
  const candidates = [];
  let inCode = false;
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (!/^([-*+]\s+|\d+[.)]\s+)/.test(trimmed)) continue;
    const cleaned = usefulLine(trimmed);
    if (cleaned && cleaned.length >= 12) candidates.push(cleaned);
  }

  const unique = [];
  const seen = new Set();
  for (const item of candidates) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique.slice(0, 12);
}

function deriveDescription(name, sourceText, providedDescription) {
  if (providedDescription?.trim()) return sentence(providedDescription).slice(0, 1024);
  const lines = String(sourceText ?? "")
    .split(/\r?\n/)
    .map((line) => usefulLine(line))
    .filter((line) => line.length >= 20 && !/^test|npm|python|node/i.test(line));
  const basis = lines[0] ?? `${titleFromName(name)} workflow`;
  return sentence(`Use when applying the repeatable ${basis.toLowerCase()}`).slice(0, 1024);
}

function deriveWhenToUse(name, sourceText, description) {
  const lower = description.replace(/^Agents should invoke this skill when\s+/i, "").replace(/^Use when\s+/i, "");
  const hints = extractProcedure(sourceText).slice(0, 3);
  const bullets = [
    `Use when ${lower.replace(/[.!?]$/, "")}.`,
    `Use when a similar successful trajectory needs to be repeated with low variance.`,
  ];
  for (const hint of hints) bullets.push(`Use when the workflow includes: ${hint.replace(/[.!?]$/, "")}.`);
  bullets.push(`Do not use for one-off work that is better captured as a note or LEARNINGS entry.`);
  return bullets;
}

function defaultWorkflow(name) {
  return [
    `Confirm the current task matches the reusable scope of ${titleFromName(name)}.`,
    "Collect the required source files, notes, or command outputs before changing anything.",
    "Apply the procedure in small, reviewable steps.",
    "Verify the result with the commands or observable checks listed below.",
    "Report changed files, verification results, and any remaining risks.",
  ];
}

function verificationSteps(sourceText) {
  const lines = String(sourceText ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const commandLines = lines.filter((line) => /^(npm|bun|python3?|pytest|uv|cargo|go test|node|pi\s|skill_eval_run)\b/.test(line.replace(/^`|`$/g, "")));
  const steps = [];
  for (const line of commandLines.slice(0, 5)) steps.push(line.replace(/^`|`$/g, ""));
  if (steps.length === 0) {
    steps.push("Run the repository or package's existing test/check command.");
    steps.push("Manually confirm the output matches the expected behavior from the source trajectory.");
  }
  return steps;
}

export function buildSkillMarkdown(options) {
  const name = slugifySkillName(options.name);
  const localOnly = Boolean(options.localOnly);
  const sourceSanitized = sanitizePrivatePaths(options.sourceText ?? "", { localOnly });
  const descriptionSanitized = sanitizePrivatePaths(deriveDescription(name, sourceSanitized.text, options.description), { localOnly });
  const description = descriptionSanitized.text;
  const procedure = extractProcedure(sourceSanitized.text);
  const workflow = procedure.length > 0 ? procedure : defaultWorkflow(name);
  const whenToUse = deriveWhenToUse(name, sourceSanitized.text, description);
  const verification = verificationSteps(sourceSanitized.text);
  const title = titleFromName(name);
  const compatibility = localOnly
    ? "Pi-local draft. Review private paths and environment assumptions before sharing."
    : "Portable Agent Skills-style draft. Review before enabling.";
  const reusability = options.reusability ?? "confirmed";
  const reusabilityEvidence = sentence(options.reusabilityEvidence ?? "Human confirmed this workflow is reusable.");

  const lines = [];
  lines.push("---");
  lines.push(`name: ${name}`);
  lines.push(`description: ${yamlString(description)}`);
  lines.push(`compatibility: ${yamlString(compatibility)}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${title}`);
  lines.push("");
  lines.push("Draft Agent Skill generated by `skill-creator`. Review and validate before enabling.");
  lines.push("");
  lines.push("## When to Use");
  lines.push("");
  for (const item of whenToUse) lines.push(`- ${item}`);
  lines.push("");
  lines.push("## Reusability Evidence");
  lines.push("");
  lines.push(`- Class: \`${reusability}\``);
  if (options.reuseCount) lines.push(`- Observed reuse count: ${Math.trunc(options.reuseCount)}`);
  lines.push(`- Evidence: ${reusabilityEvidence}`);
  lines.push("");
  lines.push("## Inputs");
  lines.push("");
  lines.push("- Source files, notes, command outputs, or user context needed by this workflow.");
  lines.push("- Existing project conventions and verification commands.");
  lines.push("- Any constraints that make this invocation different from the source trajectory.");
  lines.push("");
  lines.push("## Workflow");
  lines.push("");
  workflow.forEach((step, index) => lines.push(`${index + 1}. ${sentence(step)}`));
  lines.push("");
  lines.push("## Verification");
  lines.push("");
  for (const step of verification) {
    if (/^(npm|bun|python3?|pytest|uv|cargo|go test|node|pi\s|skill_eval_run)\b/.test(step)) lines.push(`- \`${step}\``);
    else lines.push(`- ${sentence(step)}`);
  }
  lines.push("");
  lines.push("## Safety and Failure Modes");
  lines.push("");
  lines.push("- Stop when required source evidence is missing or contradicts the expected workflow.");
  lines.push("- Ask before destructive actions, external side effects, or enabling/installing this draft skill.");
  lines.push("- Do not include secrets, tokens, private customer data, or unredacted sensitive paths in outputs.");
  lines.push("- Prefer a short memory/LEARNINGS note instead if the workflow no longer appears reusable.");
  lines.push("");
  lines.push("## Enablement");
  lines.push("");
  lines.push("This is a disabled draft. Review it, run its tests/evaluator, and ask the user before moving it into an auto-discovered skill root or enabling a package.");
  lines.push("");

  const warnings = [...sourceSanitized.warnings, ...descriptionSanitized.warnings];
  return { markdown: lines.join("\n"), warnings: [...new Set(warnings)] };
}

export function validateDraftText(markdown, { localOnly = false } = {}) {
  const errors = [];
  const warnings = [];
  const text = String(markdown ?? "");
  const frontmatter = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatter) {
    errors.push("Missing YAML frontmatter.");
  } else {
    const name = frontmatter[1].match(/^name:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "");
    const description = frontmatter[1].match(/^description:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "");
    if (!name) errors.push("Frontmatter missing name.");
    else if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(name) || name.includes("--")) errors.push(`Invalid skill name: ${name}`);
    if (!description) errors.push("Frontmatter missing description.");
    else {
      const wordCount = description.split(/\s+/).filter(Boolean).length;
      if (wordCount < 8) warnings.push("Description may be too short for reliable routing.");
      if (/^(helps with|useful skill|does stuff|misc)$/i.test(description)) warnings.push("Description is too vague for reliable routing.");
      if (description.length > 1024) errors.push("Description exceeds Agent Skills 1024 character limit.");
    }
  }

  for (const section of ["## When to Use", "## Workflow", "## Verification", "## Safety and Failure Modes"]) {
    if (!text.includes(section)) errors.push(`Missing required section: ${section}`);
  }

  if (!localOnly && PRIVATE_PATH_RE.test(text)) errors.push("Draft contains private-looking absolute home paths.");
  if (!/disabled draft|not enabled automatically|before enabling/i.test(text)) warnings.push("Draft should explicitly say it is not enabled automatically.");

  return { ok: errors.length === 0, errors, warnings };
}

function validateReusability(options) {
  const reusability = String(options.reusability ?? "").trim();
  const evidence = String(options.reusabilityEvidence ?? "").trim();
  const reuseCount = Number(options.reuseCount ?? 0);
  if (BLOCKED_REUSABILITY.has(reusability) || !reusability) {
    throw new Error("Draft creation blocked: confirm the workflow is repeated, expensive, strategically reusable, or explicitly confirmed reusable.");
  }
  if (!VALID_REUSABILITY.has(reusability)) {
    throw new Error(`Invalid reusability class: ${reusability}`);
  }
  if (reusability === "repeated-3-plus" && reuseCount > 0 && reuseCount < 3) {
    throw new Error("Draft creation blocked: repeated-3-plus requires at least three observed uses or omit reuseCount and provide external evidence.");
  }
  if (evidence.length < 12) {
    throw new Error("Draft creation blocked: reusabilityEvidence must explain why this deserves a skill.");
  }
}

async function readSource(options) {
  if (options.sourceText?.trim()) return options.sourceText;
  const sourcePath = options.sourceNotesPath || options.sourcePatchPath || options.sourcePath;
  if (!sourcePath) return "";
  const resolved = resolveUserPath(sourcePath, options.cwd ?? process.cwd());
  return await fs.readFile(resolved, "utf8");
}

async function writeFileSafe(filePath, content, { overwrite = false, filesWritten }) {
  if (!overwrite && fsSync.existsSync(filePath)) throw new Error(`Refusing to overwrite existing file: ${filePath}`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  filesWritten.push(filePath);
}

function packageJsonFor(name, description) {
  return `${JSON.stringify({
    name: `@firstpick/pi-skill-${name}`,
    version: "0.1.0",
    description,
    license: "MIT",
    keywords: ["pi-package", "pi", "pi-coding-agent", "skill", "agent-skill", name],
    pi: { skills: ["./skills"] },
    scripts: { test: `python3 -m unittest discover -s skills/${name}/tests -p 'test_*.py'` },
    files: ["skills", "README.md", "LICENSE"],
  }, null, 2)}\n`;
}

function readmeFor(name, description) {
  return `# @firstpick/pi-skill-${name}\n\n${description}\n\n## Install\n\n\`\`\`bash\npi install npm:@firstpick/pi-skill-${name}\n\`\`\`\n\n## Skill\n\n- \`${name}\`\n\n## Verification\n\n\`\`\`bash\nnpm test\n\`\`\`\n`;
}

function licenseText() {
  return `MIT License\n\nCopyright (c) 2026 Firstpick\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`;
}

function generatedContractTest(name) {
  return `import re\nimport unittest\nfrom pathlib import Path\n\nSKILL = Path(__file__).resolve().parents[1] / "SKILL.md"\n\nclass GeneratedSkillContractTests(unittest.TestCase):\n    def test_skill_contract_sections(self):\n        text = SKILL.read_text(encoding="utf-8")\n        self.assertRegex(text, r"^---\\s*\\n[\\s\\S]*?name:\\s*${name}[\\s\\S]*?\\n---", "missing valid frontmatter")\n        for section in ["## When to Use", "## Workflow", "## Verification", "## Safety and Failure Modes"]:\n            self.assertIn(section, text)\n\n    def test_no_private_home_paths(self):\n        text = SKILL.read_text(encoding="utf-8")\n        self.assertIsNone(re.search(r"/(home|Users)/[A-Za-z0-9._-]+", text))\n\nif __name__ == "__main__":\n    unittest.main()\n`;
}

async function runCommand(command, args, { cwd, timeoutMs = 30_000 } = {}) {
  return await new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise({ code: null, stdout, stderr: error.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr });
    });
  });
}

async function maybeRunEvaluator(skillPath) {
  const result = await runCommand("skill_eval_run", [skillPath], { cwd: path.dirname(skillPath), timeoutMs: 60_000 });
  if (result.code == null && /ENOENT|not found/i.test(result.stderr)) {
    return { attempted: true, available: false, code: null, stdout: result.stdout, stderr: result.stderr };
  }
  return { attempted: true, available: result.code !== null, code: result.code, stdout: result.stdout, stderr: result.stderr };
}

export async function createDraft(rawOptions) {
  const options = { ...rawOptions };
  validateReusability(options);
  const cwd = options.cwd ?? process.cwd();
  const name = slugifySkillName(options.name);
  const sourceText = await readSource({ ...options, cwd });
  const { markdown, warnings: buildWarnings } = buildSkillMarkdown({ ...options, name, sourceText });
  const validation = validateDraftText(markdown, { localOnly: Boolean(options.localOnly) });

  const filesWritten = [];
  const packageSkeleton = Boolean(options.packageSkeleton);
  const overwrite = Boolean(options.overwrite);
  let outputDir;
  let skillDir;
  let packageRoot;

  if (packageSkeleton) {
    packageRoot = options.outputDir
      ? resolveUserPath(options.outputDir, cwd)
      : path.resolve(cwd, `pi-skill-${name}`);
    outputDir = packageRoot;
    skillDir = path.join(packageRoot, "skills", name);
  } else {
    outputDir = options.outputDir
      ? resolveUserPath(options.outputDir, cwd)
      : path.join(getAgentDir(), "drafts", "skills", name);
    skillDir = outputDir;
    if (!options.allowDiscoveredOutput && isDiscoveredSkillPath(skillDir)) {
      throw new Error(`Refusing to write a disabled draft under Pi's discovered skill root: ${skillDir}. Use ${path.join(getAgentDir(), "drafts", "skills", name)} or pass allowDiscoveredOutput only after explicit user approval.`);
    }
  }

  const skillPath = path.join(skillDir, "SKILL.md");
  await writeFileSafe(skillPath, markdown, { overwrite, filesWritten });

  if (options.withTests) {
    await writeFileSafe(path.join(skillDir, "tests", "test_skill_contract.py"), generatedContractTest(name), { overwrite, filesWritten });
    if (sourceText.trim()) {
      const sanitizedFixture = sanitizePrivatePaths(sourceText, { localOnly: Boolean(options.localOnly) }).text;
      await writeFileSafe(path.join(skillDir, "tests", "fixtures", "source-notes.md"), sanitizedFixture, { overwrite, filesWritten });
    }
  }

  if (packageSkeleton) {
    const description = validateDraftText(markdown).ok
      ? markdown.match(/^description:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? `${titleFromName(name)} skill.`
      : `${titleFromName(name)} skill.`;
    await writeFileSafe(path.join(packageRoot, "package.json"), packageJsonFor(name, description), { overwrite, filesWritten });
    await writeFileSafe(path.join(packageRoot, "README.md"), readmeFor(name, description), { overwrite, filesWritten });
    await writeFileSafe(path.join(packageRoot, "LICENSE"), licenseText(), { overwrite, filesWritten });
  }

  const evaluator = options.runEvaluator ? await maybeRunEvaluator(skillPath) : { attempted: false, available: false };
  const warnings = [...new Set([...buildWarnings, ...validation.warnings])];

  return {
    ok: validation.ok && (!evaluator.attempted || evaluator.code === 0 || evaluator.available === false),
    name,
    skillPath,
    skillDir,
    outputDir,
    packageRoot,
    packageSkeleton,
    filesWritten,
    validation,
    evaluator,
    warnings,
    enablement: "Draft was written only; it was not enabled. Review and ask before moving it into an auto-discovered skill root or installing a package.",
  };
}

export function parseCliArgs(argv, defaults = {}) {
  const options = { ...defaults };
  const args = [...argv];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = () => {
      const value = args[++i];
      if (value === undefined) throw new Error(`Missing value for ${arg}`);
      return value;
    };
    switch (arg) {
      case "--name": options.name = next(); break;
      case "--source-notes": options.sourceNotesPath = next(); break;
      case "--source-patch": options.sourcePatchPath = next(); break;
      case "--source-path": options.sourcePath = next(); break;
      case "--source-text": options.sourceText = next(); break;
      case "--output": options.outputDir = next(); break;
      case "--description": options.description = next(); break;
      case "--reusability": options.reusability = next(); break;
      case "--reusability-evidence": options.reusabilityEvidence = next(); break;
      case "--reuse-count": options.reuseCount = Number(next()); break;
      case "--package-skeleton": options.packageSkeleton = true; break;
      case "--with-tests": options.withTests = true; break;
      case "--run-evaluator": options.runEvaluator = true; break;
      case "--overwrite": options.overwrite = true; break;
      case "--local-only": options.localOnly = true; break;
      case "--allow-discovered-output": options.allowDiscoveredOutput = true; break;
      case "--json": options.json = true; break;
      case "--help": options.help = true; break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!options.name && !options.help) throw new Error("--name is required");
  return options;
}

export function cliHelp() {
  return `Usage: skill_create_draft.mjs --name <skill-name> [options]\n\nRequired safety gate:\n  --reusability <repeated-3-plus|expensive|strategic-reuse|confirmed>\n  --reusability-evidence <why this deserves a skill>\n\nSource options:\n  --source-notes <file>       Successful trajectory notes\n  --source-patch <file>       PATCH.md-style source\n  --source-text <text>        Inline source text\n\nOutput options:\n  --output <dir>              Draft skill dir, or package root with --package-skeleton\n  --package-skeleton          Create pi-skill-<name>/ package skeleton\n  --with-tests                Add generated contract tests\n  --run-evaluator             Try skill_eval_run if available\n  --overwrite                 Overwrite existing generated files\n  --local-only                Mark draft as Pi-local\n  --json                      Print JSON result\n`;
}

export async function runCli(argv, defaults = {}) {
  try {
    const options = parseCliArgs(argv, defaults);
    if (options.help) {
      console.log(cliHelp());
      return 0;
    }
    const result = await createDraft(options);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Created draft skill: ${result.skillPath}`);
      if (result.filesWritten.length > 1) console.log(`Files written:\n${result.filesWritten.map((f) => `- ${f}`).join("\n")}`);
      if (result.warnings.length > 0) console.log(`Warnings:\n${result.warnings.map((w) => `- ${w}`).join("\n")}`);
      if (!result.validation.ok) console.log(`Validation errors:\n${result.validation.errors.map((e) => `- ${e}`).join("\n")}`);
      console.log(result.enablement);
    }
    return result.ok ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
}
