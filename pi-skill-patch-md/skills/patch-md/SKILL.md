---
name: patch-md
description: Agents should invoke this skill to create, update, and implement standardized PATCH.md files that document exact, reproducible source code patches and verification steps.
---

# Patch MD Skill

## When to Use

Activate this skill when the task is to:

- Create a new `PATCH.md`
- Update an existing `PATCH.md`
- Implement changes described in a `PATCH.md`
- Reapply a patch in another environment/repository

Use this skill whenever reproducibility and portability of patch instructions matter.

## Required Standard Structure

`PATCH.md` must always use the same section order and headings:

1. `# PATCH.md — <short patch title>`
2. `## Purpose`
3. `### Root cause`
4. `### Expected outcome`
5. `## Scope (exact files changed)`
   - optional `Path variables:` block for `${VAR}` placeholders used in file paths
6. One or more `## Change N — <short change title>` blocks
   - `**File:** <path>`
   - `### What was changed`
   - `### Why`
7. `## Verification steps`
8. `## Operational notes`

Use the template at `./PATCH-TEMPLATE.md`.

## Tool-Call Integration

This skill defines a tool-call contract for machine-readable extraction:

- Spec: `./TOOL-CALL-SPEC.md`
- JSON Schema: `./patch-md-tool.schema.json`
- Script (preferred): `./scripts/patch_md_extract.mjs`
- Recommended tool name: `patch_md_extract`

The skill supports two execution modes:

1. **Script mode (preferred)**
   - Invoke `patch_md_extract.mjs` with `--strict` (default).
   - Use structured JSON output as the execution source of truth.
2. **Unstrict tool-call mode (fallback)**
   - Use `strict=false` behavior when strict parsing fails on legacy PATCH.md variants.
   - Continue only when parsed output is implementation-safe.

## Mode A — Create/Update PATCH.md

### Step A1: Discover actual patch facts

1. Read relevant source files.
2. Identify exact paths and exact changes.
3. Verify behavior/commands before writing claims.

Do not invent diffs, commands, or outcomes.

### Step A2: Produce standardized PATCH.md

- Follow required section order exactly.
- Keep paths and commands copy/paste ready.
- Use POSIX-style paths in the document for Linux/macOS portability.
- For each change block, include concrete before/after snippets where helpful.

### Step A3: Self-validate before finalizing

Confirm all checks pass:

- Section order matches standard structure exactly.
- Every `Change N` block has file path, what changed, and why.
- Verification commands are runnable and specific.
- Scope file list includes every touched file and no unrelated files.
- Wording is implementation-level, not high-level only.

If any check fails, revise the file before returning.

## Mode B — Implement PATCH.md

### Step B1: Parse PATCH.md into an execution plan

Preferred flow (script mode):

1. Run `./scripts/patch_md_extract.mjs --patch <PATCH.md path> --strict`.
2. Validate output against `./patch-md-tool.schema.json`.
3. If `ok=true`, use parsed JSON as execution input.

Fallback flow (unstrict tool-call mode):

1. Run parser/tool-call with `strict=false` (`--no-strict` in script mode).
2. Accept output only if `ok=true` and required execution fields are present.
3. If still `ok=false`, stop and request PATCH.md correction.

If PATCH.md is ambiguous or incomplete, stop and ask targeted clarification.

### Step B2: Apply patch exactly

- Apply changes file-by-file in listed order (`Change 1`, `Change 2`, ...).
- Modify only files in PATCH scope unless user explicitly approves scope expansion.
- Keep edits minimal and targeted.
- Preserve unrelated code and formatting conventions.

### Step B3: Verify and report

- Run verification commands from PATCH.md.
- Report pass/fail with concrete output.
- If a step fails, include: failure, attempted fix, remaining blocker.

## Output Contract

### For Create/Update requests

- Output path of written/updated `PATCH.md`
- Brief summary of what was documented
- Verification status for claims

### For Implement requests

- List of modified files
- Summary of applied changes by `Change N`
- Verification results (commands + outcome)
- Any remaining risks or manual follow-ups

## Guardrails

- Never claim a patch is implemented without file evidence.
- Never claim verification success without command/output evidence.
- Never change behavior outside PATCH.md scope unless explicitly approved.
- Never continue implementation if tool output reports structural errors.
- If PATCH.md conflicts with code reality, report mismatch and propose corrected PATCH.md updates.
