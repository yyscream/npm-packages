#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const agentDir = process.env.PI_CODING_AGENT_DIR || path.join(homedir(), ".pi", "agent");

const options = {
  settingsPath: undefined,
  skillRoots: [],
  fixturesDir: path.join(repoRoot, "tests", "routing"),
  json: false,
};

for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === "--settings") options.settingsPath = path.resolve(process.argv[++i]);
  else if (arg === "--skill-root") options.skillRoots.push(path.resolve(process.argv[++i]));
  else if (arg === "--fixtures") options.fixturesDir = path.resolve(process.argv[++i]);
  else if (arg === "--json") options.json = true;
  else if (arg === "--help" || arg === "-h") {
    console.log(`Usage: node dev/scripts/validate-skill-routing-fixtures.mjs [--settings PATH] [--skill-root PATH] [--fixtures DIR] [--json]\n\nValidates tests/routing/*.json. By default this is schema-only and does not read the user's Pi config. Pass --settings or one or more --skill-root values to check coverage and description-overlap candidates against explicit targets.`);
    process.exit(0);
  } else {
    console.error(`Unknown argument: ${arg}`);
    process.exit(2);
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function stripQuotes(value) {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function parseSkillFrontmatter(skillPath) {
  const text = readFileSync(skillPath, "utf8");
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return undefined;

  const frontmatter = match[1].split(/\r?\n/);
  const parsed = {};
  for (let i = 0; i < frontmatter.length; i += 1) {
    const line = frontmatter[i];
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) continue;
    const [, key, rawValue] = keyMatch;
    const value = rawValue.trim();
    if (value === ">" || value === "|") {
      const block = [];
      for (let j = i + 1; j < frontmatter.length; j += 1) {
        if (/^\S[^:]*:\s*/.test(frontmatter[j])) break;
        block.push(frontmatter[j].trim());
        i = j;
      }
      parsed[key] = block.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    } else {
      parsed[key] = stripQuotes(value);
    }
  }

  if (!parsed.name) return undefined;
  return {
    name: parsed.name,
    description: parsed.description || "",
    path: skillPath,
  };
}

function expandTilde(inputPath) {
  if (inputPath === "~") return homedir();
  if (inputPath.startsWith("~/")) return path.join(homedir(), inputPath.slice(2));
  return inputPath;
}

function resolveConfiguredPath(inputPath, baseDir) {
  const expanded = expandTilde(inputPath);
  return path.isAbsolute(expanded) ? path.resolve(expanded) : path.resolve(baseDir, expanded);
}

function stripNpmVersion(spec) {
  if (spec.startsWith("@")) {
    const at = spec.lastIndexOf("@");
    return at > 0 ? spec.slice(0, at) : spec;
  }
  const at = spec.lastIndexOf("@");
  return at > 0 ? spec.slice(0, at) : spec;
}

function resolvePackageDir(source, settingsDir) {
  if (source.startsWith("npm:")) {
    const packageName = stripNpmVersion(source.slice(4));
    return path.join(settingsDir, "npm", "node_modules", ...packageName.split("/"));
  }
  if (/^(git|https?|ssh):/.test(source)) return undefined;
  return resolveConfiguredPath(source, settingsDir);
}

function walkSkillFiles(root) {
  if (!existsSync(root)) return [];
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      let st;
      try {
        st = statSync(fullPath);
      } catch {
        continue;
      }
      if (st.isDirectory()) stack.push(fullPath);
      else if (entry === "SKILL.md") out.push(fullPath);
    }
  }
  return out.sort();
}

function discoverSkillsFromPath(configuredPath, settingsDir) {
  const resolved = resolveConfiguredPath(configuredPath, settingsDir);
  if (!existsSync(resolved)) return [];
  const st = statSync(resolved);
  if (st.isFile() && path.basename(resolved) === "SKILL.md") {
    const parsed = parseSkillFrontmatter(resolved);
    return parsed ? [parsed] : [];
  }
  if (st.isDirectory()) {
    const direct = path.join(resolved, "SKILL.md");
    const files = existsSync(direct) ? [direct] : walkSkillFiles(resolved);
    return files.map(parseSkillFrontmatter).filter(Boolean);
  }
  return [];
}

function packageSource(entry) {
  return typeof entry === "string" ? entry : entry?.source;
}

function discoverEnabledSkills(settings, settingsPath, warnings) {
  const settingsDir = path.dirname(settingsPath);
  const enabled = new Map();

  for (const rawEntry of settings.skills || []) {
    if (typeof rawEntry !== "string") continue;
    if (rawEntry.startsWith("!") || rawEntry.startsWith("-")) continue;
    const configuredPath = rawEntry.startsWith("+") ? rawEntry.slice(1) : rawEntry;
    const skills = discoverSkillsFromPath(configuredPath, settingsDir);
    if (skills.length === 0) {
      warnings.push(`Configured skill path did not resolve to a parseable SKILL.md: ${configuredPath}`);
      continue;
    }
    for (const skill of skills) {
      enabled.set(skill.name, { ...skill, enabledFrom: "settings.skills" });
    }
  }

  for (const entry of settings.packages || []) {
    const source = packageSource(entry);
    if (!source) continue;
    const packageDir = resolvePackageDir(source, settingsDir);
    if (!packageDir) {
      warnings.push(`Package source cannot be resolved locally for routing fixture validation: ${source}`);
      continue;
    }
    if (!existsSync(packageDir)) {
      warnings.push(`Package source path does not exist: ${source} -> ${packageDir}`);
      continue;
    }

    const requestedSkills = typeof entry === "object" && Array.isArray(entry.skills) ? entry.skills : undefined;
    if (requestedSkills && requestedSkills.length === 0) continue;

    const discovered = walkSkillFiles(path.join(packageDir, "skills")).map(parseSkillFrontmatter).filter(Boolean);
    const foundNames = new Set(discovered.map((skill) => skill.name));
    const selected = requestedSkills ? discovered.filter((skill) => requestedSkills.includes(skill.name)) : discovered;
    for (const skill of selected) {
      enabled.set(skill.name, { ...skill, enabledFrom: `settings.packages:${source}` });
    }
    for (const requested of requestedSkills || []) {
      if (!foundNames.has(requested)) warnings.push(`Requested package skill not found: ${requested} from ${source}`);
    }
  }

  return [...enabled.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function asPromptArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);
}

function pairKey(a, b) {
  return [a, b].sort().join(" ↔ ");
}

function validateFixtures(enabledSkills, fixturesDir) {
  const checkCoverage = enabledSkills.length > 0;
  const enabledNames = new Set(enabledSkills.map((skill) => skill.name));
  const errors = [];
  const warnings = [];
  const fixtures = new Map();
  const ambiguousPairs = new Map();

  if (!existsSync(fixturesDir)) {
    errors.push(`Fixture directory is missing: ${fixturesDir}`);
    return { errors, warnings, fixtures, ambiguousPairs };
  }

  const files = readdirSync(fixturesDir)
    .filter((entry) => entry.endsWith(".json") && !entry.startsWith("_"))
    .sort();

  for (const file of files) {
    const filePath = path.join(fixturesDir, file);
    const stem = file.replace(/\.json$/, "");
    let fixture;
    try {
      fixture = readJson(filePath);
    } catch (error) {
      errors.push(`${file}: invalid JSON (${error.message})`);
      continue;
    }

    fixtures.set(stem, fixture);
    if (fixture.skill !== stem) errors.push(`${file}: skill must match file name (${stem})`);
    if (checkCoverage && !enabledNames.has(fixture.skill)) warnings.push(`${file}: fixture is not in the explicit target skill set`);

    if (!asPromptArray(fixture.should_trigger)) errors.push(`${file}: should_trigger must be an array of non-empty strings`);
    else if (fixture.should_trigger.length < 3) errors.push(`${file}: should_trigger must contain at least 3 prompts`);

    if (!asPromptArray(fixture.should_not_trigger)) errors.push(`${file}: should_not_trigger must be an array of non-empty strings`);
    else if (fixture.should_not_trigger.length < 3) errors.push(`${file}: should_not_trigger must contain at least 3 prompts`);

    const triggerSet = new Set(fixture.should_trigger || []);
    for (const prompt of fixture.should_not_trigger || []) {
      if (triggerSet.has(prompt)) errors.push(`${file}: prompt appears in both should_trigger and should_not_trigger: ${prompt}`);
    }

    const ambiguous = fixture.ambiguous || [];
    if (!Array.isArray(ambiguous)) {
      errors.push(`${file}: ambiguous must be an array when present`);
      continue;
    }
    for (const [index, entry] of ambiguous.entries()) {
      const prefix = `${file}: ambiguous[${index}]`;
      if (!entry || typeof entry !== "object") {
        errors.push(`${prefix} must be an object`);
        continue;
      }
      if (typeof entry.prompt !== "string" || entry.prompt.trim().length === 0) errors.push(`${prefix}.prompt must be a non-empty string`);
      if (!Array.isArray(entry.candidate_skills) || entry.candidate_skills.length < 2) {
        errors.push(`${prefix}.candidate_skills must list at least 2 skills`);
      } else {
        for (const candidate of entry.candidate_skills) {
          if (checkCoverage && !enabledNames.has(candidate)) warnings.push(`${prefix}: candidate skill is not in the explicit target skill set: ${candidate}`);
        }
        for (let i = 0; i < entry.candidate_skills.length; i += 1) {
          for (let j = i + 1; j < entry.candidate_skills.length; j += 1) {
            const key = pairKey(entry.candidate_skills[i], entry.candidate_skills[j]);
            const prompts = ambiguousPairs.get(key) || [];
            prompts.push({ owner: fixture.skill, prompt: entry.prompt, decision: entry.decision || "" });
            ambiguousPairs.set(key, prompts);
          }
        }
      }
      if (typeof entry.decision !== "string" || entry.decision.trim().length === 0) errors.push(`${prefix}.decision must be a non-empty string`);
      if (typeof entry.reason !== "string" || entry.reason.trim().length === 0) errors.push(`${prefix}.reason must be a non-empty string`);
      if (typeof entry.review_status !== "string" || !entry.review_status.includes("reviewed")) {
        errors.push(`${prefix}.review_status must include "reviewed"`);
      }
    }
  }

  if (checkCoverage) {
    for (const skill of enabledNames) {
      if (!fixtures.has(skill)) errors.push(`Missing routing fixture for target skill: ${skill}`);
    }
  }

  return { errors, warnings, fixtures, ambiguousPairs };
}

const stopwords = new Set([
  "about", "after", "agent", "agents", "always", "answer", "before", "between", "build", "check", "code",
  "create", "current", "description", "details", "docs", "documentation", "during", "enabled", "especially",
  "evidence", "exact", "files", "first", "from", "help", "including", "instead", "local", "needs", "package",
  "packages", "pi", "prefer", "questions", "references", "reports", "research", "routing", "should", "skill",
  "skills", "source", "sources", "specific", "test", "tests", "this", "tool", "tools", "troubleshooting", "when", "with", "workflow",
  "asks", "creating", "decision", "invoke", "invoked", "needing", "runs", "that", "updating", "user",
]);

function tokenizeDescription(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9+._-]+/g, " ")
      .split(/\s+/)
      .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
      .filter((token) => token.length >= 4 && !stopwords.has(token)),
  );
}

function findDescriptionOverlaps(enabledSkills) {
  const tokenized = enabledSkills.map((skill) => ({ ...skill, tokens: tokenizeDescription(skill.description) }));
  const overlaps = [];
  for (let i = 0; i < tokenized.length; i += 1) {
    for (let j = i + 1; j < tokenized.length; j += 1) {
      const a = tokenized[i];
      const b = tokenized[j];
      const shared = [...a.tokens].filter((token) => b.tokens.has(token)).sort();
      const unionSize = new Set([...a.tokens, ...b.tokens]).size || 1;
      const score = shared.length / unionSize;
      if (shared.length >= 2) {
        overlaps.push({ a: a.name, b: b.name, shared, score });
      }
    }
  }
  return overlaps.sort((left, right) => right.shared.length - left.shared.length || right.score - left.score).slice(0, 12);
}

function markdownReport(result) {
  const status = result.errors.length === 0 ? "PASS" : "FAIL";
  const lines = [];
  lines.push(`# Skill Routing Fixture Validation — ${status}`);
  lines.push("");
  lines.push(`Settings: \`${options.settingsPath ?? "not provided (schema-only unless --skill-root is used)"}\``);
  lines.push(`Skill roots: \`${options.skillRoots.length ? options.skillRoots.join(", ") : "not provided"}\``);
  lines.push(`Fixtures: \`${options.fixturesDir}\``);
  lines.push(`Target skills: ${result.enabledSkills.length}`);
  lines.push(`Fixture files: ${result.fixtures.size}`);
  lines.push("");
  lines.push("## Target skill coverage");
  lines.push("");
  if (result.enabledSkills.length === 0) {
    lines.push("- Coverage not checked. Pass `--settings` or `--skill-root` to compare fixtures against explicit target skills.");
  } else {
    for (const skill of result.enabledSkills) {
      const fixture = result.fixtures.get(skill.name);
      const mark = fixture ? "PASS" : "FAIL";
      const triggerCount = fixture?.should_trigger?.length || 0;
      const notTriggerCount = fixture?.should_not_trigger?.length || 0;
      lines.push(`- ${mark} \`${skill.name}\` — trigger=${triggerCount}, not-trigger=${notTriggerCount}, from ${skill.enabledFrom}`);
    }
  }
  lines.push("");
  lines.push("## Reviewed ambiguous routing prompts");
  lines.push("");
  if (result.ambiguousPairs.size === 0) {
    lines.push("- None recorded.");
  } else {
    for (const [pair, prompts] of [...result.ambiguousPairs.entries()].sort()) {
      lines.push(`- ${pair}: ${prompts.length} reviewed prompt(s)`);
      for (const item of prompts.slice(0, 3)) lines.push(`  - \`${item.owner}\`: ${item.decision || item.prompt}`);
    }
  }
  lines.push("");
  lines.push("## Description overlap candidates");
  lines.push("");
  if (result.descriptionOverlaps.length === 0) {
    lines.push("- No description overlaps crossed the reporting threshold.");
  } else {
    lines.push("| Skill A | Skill B | Shared terms | Score |");
    lines.push("|---|---|---|---:|");
    for (const overlap of result.descriptionOverlaps) {
      lines.push(`| ${overlap.a} | ${overlap.b} | ${overlap.shared.slice(0, 8).join(", ")} | ${overlap.score.toFixed(2)} |`);
    }
  }
  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("## Warnings");
    lines.push("");
    for (const warning of result.warnings) lines.push(`- ${warning}`);
  }
  if (result.errors.length > 0) {
    lines.push("");
    lines.push("## Errors");
    lines.push("");
    for (const error of result.errors) lines.push(`- ${error}`);
  }
  lines.push("");
  return lines.join("\n");
}

function discoverTargetSkills(warnings) {
  const targets = new Map();

  if (options.settingsPath) {
    if (!existsSync(options.settingsPath)) {
      console.error(`Settings file not found: ${options.settingsPath}`);
      process.exit(2);
    }
    const settings = readJson(options.settingsPath);
    for (const skill of discoverEnabledSkills(settings, options.settingsPath, warnings)) {
      targets.set(skill.name, skill);
    }
  }

  for (const root of options.skillRoots) {
    const skills = discoverSkillsFromPath(root, process.cwd());
    if (skills.length === 0) warnings.push(`Skill root did not resolve to parseable SKILL.md files: ${root}`);
    for (const skill of skills) {
      targets.set(skill.name, { ...skill, enabledFrom: `--skill-root:${root}` });
    }
  }

  return [...targets.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const warnings = [];
const enabledSkills = discoverTargetSkills(warnings);
const fixtureResult = validateFixtures(enabledSkills, options.fixturesDir);
const result = {
  settingsPath: options.settingsPath,
  skillRoots: options.skillRoots,
  fixturesDir: options.fixturesDir,
  enabledSkills,
  fixtures: fixtureResult.fixtures,
  ambiguousPairs: fixtureResult.ambiguousPairs,
  descriptionOverlaps: findDescriptionOverlaps(enabledSkills),
  warnings: [...warnings, ...fixtureResult.warnings],
  errors: fixtureResult.errors,
};

if (options.json) {
  console.log(JSON.stringify({
    settingsPath: result.settingsPath,
    skillRoots: result.skillRoots,
    fixturesDir: result.fixturesDir,
    enabledSkills: result.enabledSkills,
    fixtureCount: result.fixtures.size,
    ambiguousPairs: Object.fromEntries(result.ambiguousPairs),
    descriptionOverlaps: result.descriptionOverlaps,
    warnings: result.warnings,
    errors: result.errors,
  }, null, 2));
} else {
  console.log(markdownReport(result));
}

process.exit(result.errors.length === 0 ? 0 : 1);
