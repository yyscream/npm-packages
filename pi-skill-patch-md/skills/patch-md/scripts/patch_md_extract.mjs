#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const out = {
    patchPath: "",
    workspaceRoot: "",
    strict: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--patch" || arg === "--patchPath") {
      out.patchPath = argv[++i] ?? "";
    } else if (arg === "--workspace" || arg === "--workspaceRoot") {
      out.workspaceRoot = argv[++i] ?? "";
    } else if (arg === "--strict") {
      out.strict = true;
    } else if (arg === "--no-strict" || arg === "--unstrict") {
      out.strict = false;
    }
  }

  if (!out.patchPath) {
    throw new Error("Missing --patch <path-to-PATCH.md>");
  }

  return out;
}

function addError(result, code, message, section = null) {
  result.errors.push({ code, message, section });
}

function addWarning(result, message) {
  result.warnings.push(message);
}

function normalizeBody(text) {
  const trimmed = text.trim();
  const withoutSeparators = trimmed
    .split("\n")
    .filter((line) => line.trim() !== "---")
    .join("\n")
    .trim();
  return withoutSeparators;
}

function escapeRegex(source) {
  return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findAllHeadingMatches(markdown) {
  const matches = [];
  const rx = /^(#{1,6})\s+([^\n]+)$/gm;
  let m;
  while ((m = rx.exec(markdown)) !== null) {
    matches.push({
      start: m.index,
      end: rx.lastIndex,
      level: m[1].length,
      text: m[2].trim(),
      raw: m[0],
    });
  }
  return matches;
}

function getSectionBody(markdown, headings, headingMatcher) {
  const current = headings.find(headingMatcher);
  if (!current) return "";
  const next = headings.find((h) => h.start > current.start && h.level <= current.level);
  const end = next ? next.start : markdown.length;
  return normalizeBody(markdown.slice(current.end, end));
}

function getBodyBetweenHeadings(markdown, headings, startRaw, endRaw) {
  const start = headings.find((h) => h.raw === startRaw);
  if (!start) return "";
  const end = headings.find((h) => h.start > start.start && h.raw === endRaw);
  const sliceEnd = end ? end.start : markdown.length;
  return normalizeBody(markdown.slice(start.end, sliceEnd));
}

function parsePathVariables(scopeBody) {
  const vars = {};

  // Preferred format: Path variables:
  const preferredMatch = scopeBody.match(/(?:^|\n)Path variables:\s*\n([\s\S]*?)(?:\n\n|$)/i);
  if (preferredMatch) {
    const block = preferredMatch[1];
    const rx = /`([A-Z0-9_]+)=([^`]+)`/g;
    let m;
    while ((m = rx.exec(block)) !== null) {
      vars[m[1]] = m[2].trim();
    }
  }

  // Legacy fallback: Assume:
  const assumeMatch = scopeBody.match(/(?:^|\n)Assume:\s*\n([\s\S]*?)(?:\n\n|$)/i);
  if (assumeMatch) {
    const rx = /`([A-Z0-9_]+)=([^`]+)`/g;
    let m;
    while ((m = rx.exec(assumeMatch[1])) !== null) {
      vars[m[1]] = m[2].trim();
    }
  }

  // Legacy fallback: ### Path variables
  const h3Match = scopeBody.match(/(?:^|\n)###\s+Path variables\s*\n([\s\S]*?)(?:\n\n|$)/i);
  if (h3Match) {
    const rx = /`([A-Z0-9_]+)=([^`]+)`/g;
    let m;
    while ((m = rx.exec(h3Match[1])) !== null) {
      vars[m[1]] = m[2].trim();
    }
  }

  return vars;
}

function parseScopeFiles(scopeBody) {
  const files = [];
  const rx = /^\d+\.\s+`([^`]+)`\s*$/gm;
  let m;
  while ((m = rx.exec(scopeBody)) !== null) {
    files.push(m[1].trim());
  }
  return files;
}

function resolveVarValue(name, pathVariables) {
  if (Object.prototype.hasOwnProperty.call(pathVariables, name)) {
    return pathVariables[name];
  }
  return process.env[name] ?? "";
}

function resolvePathVars(input, pathVariables) {
  let unresolved = [];
  const output = input.replace(/\$\{([A-Z0-9_]+)\}/g, (_, varName) => {
    const value = resolveVarValue(varName, pathVariables);
    if (!value) {
      unresolved.push(varName);
      return `\${${varName}}`;
    }
    return value;
  });
  return { output, unresolved };
}

function parseChanges(markdown, headings, verificationStart, result) {
  const changeHeadings = headings.filter((h) => /^##\s+Change\s+\d+\s+—\s+.+$/u.test(h.raw));
  const changes = [];

  for (let i = 0; i < changeHeadings.length; i++) {
    const current = changeHeadings[i];
    const next = changeHeadings[i + 1];
    const end = next ? next.start : verificationStart;
    const body = normalizeBody(markdown.slice(current.end, end));

    const titleMatch = current.raw.match(/^##\s+Change\s+(\d+)\s+—\s+(.+)$/u);
    const index = titleMatch ? Number(titleMatch[1]) : i + 1;
    const title = titleMatch ? titleMatch[2].trim() : "";

    const fileMatch = body.match(/\*\*File:\*\*\s+`([^`]+)`/u);
    const whatMatch = body.match(/(?:^|\n)###\s+What was changed\s*\n([\s\S]*?)(?=(?:\n###\s+Why\b))/u);
    const whyMatch = body.match(/(?:^|\n)###\s+Why\s*\n([\s\S]*)$/u);

    if (!fileMatch || !whatMatch || !whyMatch) {
      addError(result, "INVALID_CHANGE_BLOCK", `Change ${index} is missing required fields`, `Change ${index}`);
      continue;
    }

    changes.push({
      index,
      title,
      file: fileMatch[1].trim(),
      whatChanged: normalizeBody(whatMatch[1]),
      why: normalizeBody(whyMatch[1]),
    });
  }

  return changes.sort((a, b) => a.index - b.index);
}

function parseVerification(verificationBody) {
  const runFromMatch = verificationBody.match(/Run from\s+`([^`]+)`/u);
  const runFrom = runFromMatch ? runFromMatch[1].trim() : "";

  const cmdBlockMatch = verificationBody.match(/```bash\n([\s\S]*?)```/u);
  const commands = cmdBlockMatch
    ? cmdBlockMatch[1]
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : [];

  const expected = [];
  const expectedMatch = verificationBody.match(/(?:^|\n)Expected:\s*\n([\s\S]*)$/u);
  if (expectedMatch) {
    const bulletRx = /^-\s+(.+)$/gm;
    let m;
    while ((m = bulletRx.exec(expectedMatch[1])) !== null) {
      expected.push(m[1].trim());
    }
  }

  return { runFrom, commands, expected };
}

function parseOperationalNotes(opsBody) {
  const notes = [];
  const rx = /^-\s+(.+)$/gm;
  let m;
  while ((m = rx.exec(opsBody)) !== null) {
    notes.push(m[1].trim());
  }
  return notes;
}

function validateHeadingOrder(markdown, strict, result) {
  const requirements = [
    { label: "title", rx: /^#\s+PATCH\.md\s+—\s+.+$/mu },
    { label: "purpose", rx: /^##\s+Purpose\s*$/mu },
    { label: "rootCause", rx: /^###\s+Root cause\s*$/mu },
    { label: "expectedOutcome", rx: /^###\s+Expected outcome\s*$/mu, optionalWhenUnstrict: true },
    { label: "scope", rx: /^##\s+Scope \(exact files changed\)\s*$/mu },
    { label: "change", rx: /^##\s+Change\s+\d+\s+—\s+.+$/mu },
    { label: "verification", rx: /^##\s+Verification steps\s*$/mu },
    { label: "operationalNotes", rx: /^##\s+Operational notes\s*$/mu },
  ];

  const positions = [];
  for (const req of requirements) {
    const match = markdown.match(req.rx);
    if (!match) {
      if (!strict && req.optionalWhenUnstrict) {
        addWarning(result, "Missing ### Expected outcome; expectedOutcome set to empty string");
        positions.push(null);
      } else {
        addError(result, "MISSING_SECTION", `Missing required section: ${req.label}`, req.label);
        positions.push(null);
      }
      continue;
    }
    positions.push(match.index ?? -1);
  }

  if (result.errors.length > 0) return;

  let previous = -1;
  for (const pos of positions) {
    if (pos === null) continue;
    if (pos < previous) {
      addError(result, "OUT_OF_ORDER_SECTION", "Required sections are not in canonical order", null);
      break;
    }
    previous = pos;
  }
}

function buildEmptyPatch() {
  return {
    title: "",
    purpose: "",
    rootCause: "",
    expectedOutcome: "",
    pathVariables: {},
    scopeFiles: [],
    changes: [],
    verification: {
      runFrom: "",
      commands: [],
      expected: [],
    },
    operationalNotes: [],
  };
}

function parsePatch(markdown, options) {
  const result = {
    ok: false,
    patch: buildEmptyPatch(),
    errors: [],
    warnings: [],
  };

  validateHeadingOrder(markdown, options.strict, result);
  if (result.errors.length > 0) {
    return result;
  }

  const headings = findAllHeadingMatches(markdown);

  const titleMatch = markdown.match(/^#\s+PATCH\.md\s+—\s+(.+)$/mu);
  result.patch.title = titleMatch ? titleMatch[1].trim() : "";

  result.patch.purpose = getBodyBetweenHeadings(markdown, headings, "## Purpose", "### Root cause");
  result.patch.rootCause = getBodyBetweenHeadings(markdown, headings, "### Root cause", "### Expected outcome");

  const hasExpectedHeading = headings.some((h) => h.raw === "### Expected outcome");
  if (hasExpectedHeading) {
    result.patch.expectedOutcome = getBodyBetweenHeadings(
      markdown,
      headings,
      "### Expected outcome",
      "## Scope (exact files changed)",
    );
  } else {
    result.patch.expectedOutcome = "";
  }

  const scopeHeading = headings.find((h) => h.raw === "## Scope (exact files changed)");
  const firstChangeHeading = headings.find((h) => /^##\s+Change\s+\d+\s+—\s+.+$/u.test(h.raw));
  const verificationHeading = headings.find((h) => h.raw === "## Verification steps");
  const opsHeading = headings.find((h) => h.raw === "## Operational notes");

  if (!scopeHeading || !firstChangeHeading || !verificationHeading || !opsHeading) {
    addError(result, "INVALID_MARKDOWN", "Could not determine major section boundaries", null);
    return result;
  }

  const scopeBody = normalizeBody(markdown.slice(scopeHeading.end, firstChangeHeading.start));
  result.patch.pathVariables = parsePathVariables(scopeBody);
  result.patch.scopeFiles = parseScopeFiles(scopeBody);

  if (result.patch.scopeFiles.length === 0) {
    addError(result, "EMPTY_SCOPE", "No files listed in Scope", "scope");
  }

  result.patch.changes = parseChanges(markdown, headings, verificationHeading.start, result);

  const verificationBody = normalizeBody(markdown.slice(verificationHeading.end, opsHeading.start));
  result.patch.verification = parseVerification(verificationBody);
  if (result.patch.verification.commands.length === 0) {
    addError(result, "EMPTY_VERIFICATION", "No verification commands listed", "verification");
  }

  const opsBody = normalizeBody(markdown.slice(opsHeading.end));
  result.patch.operationalNotes = parseOperationalNotes(opsBody);

  // Detect unresolved variables in scope files and change files.
  const checkPaths = [...result.patch.scopeFiles, ...result.patch.changes.map((c) => c.file)];
  const unresolvedVars = new Set();
  for (const p of checkPaths) {
    const { unresolved } = resolvePathVars(p, result.patch.pathVariables);
    for (const name of unresolved) unresolvedVars.add(name);
  }
  for (const name of unresolvedVars) {
    addError(result, "UNRESOLVED_PATH_VARIABLE", `Unresolved path variable: ${name}`, "scope");
  }

  // Optionally resolve paths using workspace root.
  if (options.workspaceRoot) {
    result.patch.scopeFiles = result.patch.scopeFiles.map((p) => {
      const { output } = resolvePathVars(p, result.patch.pathVariables);
      if (output.startsWith("/") || output.match(/^[A-Za-z]:[\\/]/)) return output;
      return path.posix.join(options.workspaceRoot.replace(/\\/g, "/"), output);
    });
    result.patch.changes = result.patch.changes.map((c) => {
      const { output } = resolvePathVars(c.file, result.patch.pathVariables);
      const resolved = output.startsWith("/") || output.match(/^[A-Za-z]:[\\/]/)
        ? output
        : path.posix.join(options.workspaceRoot.replace(/\\/g, "/"), output);
      return { ...c, file: resolved };
    });
  }

  result.ok = result.errors.length === 0;
  return result;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(String(err.message || err));
    process.exit(2);
  }

  const patchPath = path.resolve(options.patchPath);
  const initial = {
    ok: false,
    patch: buildEmptyPatch(),
    errors: [],
    warnings: [],
  };

  if (!fs.existsSync(patchPath)) {
    addError(initial, "FILE_NOT_FOUND", `PATCH file not found: ${patchPath}`, null);
    console.log(JSON.stringify(initial, null, 2));
    process.exit(1);
  }

  let markdown = "";
  try {
    markdown = fs.readFileSync(patchPath, "utf8");
  } catch (err) {
    addError(initial, "INVALID_MARKDOWN", `Could not read PATCH file: ${String(err.message || err)}`, null);
    console.log(JSON.stringify(initial, null, 2));
    process.exit(1);
  }

  const result = parsePatch(markdown, {
    strict: options.strict,
    workspaceRoot: options.workspaceRoot,
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main();
