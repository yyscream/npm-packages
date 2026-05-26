# PATCH.md Tool Call Specification

This document defines a precise tool-call contract for consuming `PATCH.md` files so an agent has all required implementation data.

## Tool name

`patch_md_extract`

## Preferred implementation

Use the bundled script parser:

`./scripts/patch_md_extract.mjs`

Example:

```bash
node ./skills/patch-md/scripts/patch_md_extract.mjs --patch /path/to/PATCH.md --strict
```

Fallback (unstrict mode):

```bash
node ./skills/patch-md/scripts/patch_md_extract.mjs --patch /path/to/PATCH.md --no-strict
```

## Purpose

Parse a standardized `PATCH.md` file and return structured implementation instructions.

## Input

```json
{
  "patchPath": "string (required) — path to PATCH.md",
  "workspaceRoot": "string (optional) — base path used to resolve relative file paths",
  "strict": "boolean (optional, default true) — require exact section structure and fail on deviations"
}
```

CLI mapping:

- `patchPath` -> `--patch`
- `workspaceRoot` -> `--workspace`
- `strict=true` -> `--strict` (default)
- `strict=false` -> `--no-strict` or `--unstrict`

## Output

```json
{
  "ok": "boolean",
  "patch": {
    "title": "string",
    "purpose": "string",
    "rootCause": "string",
    "expectedOutcome": "string",
    "pathVariables": {
      "VAR_NAME": "string value"
    },
    "scopeFiles": ["string"],
    "changes": [
      {
        "index": "number",
        "title": "string",
        "file": "string",
        "whatChanged": "string",
        "why": "string"
      }
    ],
    "verification": {
      "runFrom": "string",
      "commands": ["string"],
      "expected": ["string"]
    },
    "operationalNotes": ["string"]
  },
  "errors": [
    {
      "code": "string",
      "message": "string",
      "section": "string | null"
    }
  ],
  "warnings": ["string"]
}
```

## Validation rules

When `strict=true`, all rules below are mandatory.

1. Required headings exist exactly once and in order:
   - `# PATCH.md — ...`
   - `## Purpose`
   - `### Root cause`
   - `### Expected outcome`
   - `## Scope (exact files changed)`
   - `## Change N — ...` (>= 1)
   - `## Verification steps`
   - `## Operational notes`
2. Every `Change N` block must include:
   - `**File:** ...`
   - `### What was changed`
   - `### Why`
3. `Scope` file list must be present and non-empty.
4. `Verification steps` must contain at least one command.
5. `runFrom` path must be extracted from `Run from` line when present.
6. Extract path variables from a `Path variables:` block under Scope when present.

When `strict=false`:

- Missing `### Expected outcome` is allowed; set `expectedOutcome` to empty string and emit a warning.
- Legacy `Assume:` blocks under `Scope` may be parsed as path variables.
- Legacy `### Path variables` subheadings under `Scope` may be parsed as path variables.
- Structural violations still return `ok=false` when they prevent safe implementation.

## Error codes

- `FILE_NOT_FOUND` — patchPath does not exist
- `INVALID_MARKDOWN` — file content cannot be parsed safely
- `MISSING_SECTION` — required heading missing
- `OUT_OF_ORDER_SECTION` — required headings not in canonical order
- `INVALID_CHANGE_BLOCK` — a change block misses required fields
- `EMPTY_SCOPE` — no files listed in scope
- `EMPTY_VERIFICATION` — no verification commands listed
- `UNRESOLVED_PATH_VARIABLE` — file path contains `${VAR}` that is not defined by path variables or runtime context

## Normalization rules

- Trim leading/trailing whitespace in extracted text fields.
- Exclude section separators (`---`) from extracted field bodies.
- Preserve fenced code blocks and bullet lists inside `whatChanged` and `why`.

## Tool consumer behavior (agent)

After calling `patch_md_extract`:

1. If `ok=false`, stop and request clarification or patch correction.
2. If `ok=true`, generate execution plan from `patch.changes` in ascending `index` order.
3. Apply changes only to files in `patch.scopeFiles` unless user explicitly approves scope expansion.
4. Resolve `${VAR}` placeholders in paths using `patch.pathVariables` first, then runtime environment.
5. Run `patch.verification.commands` from `patch.verification.runFrom` when provided.
6. Report results mapped to each `Change N` block.

## Portability note

Use POSIX-style paths (`/`) in `PATCH.md` so extracted paths are portable across Linux/macOS.
