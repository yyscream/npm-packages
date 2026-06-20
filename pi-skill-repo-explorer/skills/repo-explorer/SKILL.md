---
name: repo-explorer
description: Agents should invoke this skill before modifying unfamiliar codebases, answering where/how something is implemented, tracing dependencies, mapping repo structure, or planning changes. Explores a repository and returns a strict JSON handoff with key files, symbols, risks, and evidence.
---

# Repo Explorer

## When to Use

Activate this skill when:

- A caller agent needs to understand a repository before implementing, reviewing, or designing
- The task includes "explore", "map", "find where X is", "understand the codebase"
- The caller should NOT spend their own context window on raw file reads and searches

## Workflow

### Step 1: Parse the Request

The caller provides a request (natural language or structured). Extract:

- **goal**: What does the caller need to know? (e.g., "find the auth flow")
- **target_paths**: Which repo/directory to explore (absolute paths)
- **depth**: `shallow` (structure only), `standard` (structure + key symbols), `deep` (full dependency tracing)
- **constraints**: Any filters (language, directory scope, file patterns)

If the request is natural language, infer these fields before proceeding.

### Step 2: Prefer Native Tool When Available

If the `repo_explorer_explore` tool is available, call it first with `budget: "compact"` and `includeEvidence: false` unless exact snippets are needed. It wraps index refresh/build, budget-aware extraction, validation, report writing, and compact output in one tool call.

Use the script workflow below only when the native tool is unavailable or you need to debug the helper scripts directly.

```bash
# Check if persistent index exists and is fresh
python3 ./scripts/refresh_repo_index.py --repo "<target_path>" --data-dir data/

# If no index exists, build from scratch
python3 ./scripts/build_repo_index.py --repo "<target_path>" --output data/<repo-name>-index.json
```

### Step 3: Targeted Exploration

Using the index as a map, perform targeted reads and searches:

1. Identify entry points (main files, config, build manifests)
2. Follow imports/dependencies relevant to the goal
3. Locate symbols, functions, and modules the caller needs
4. Collect short evidence snippets (max 20 lines each)

Depth semantics:

| Depth | Budget and behavior |
|---|---|
| `shallow` | Structure-first scan, up to 10 key files, no evidence snippets, no dependency tracing. |
| `standard` | Goal-focused scan, up to 25 key files, relevant symbols, internal dependency imports, up to 5 decisive snippets. |
| `deep` | Lower relevance threshold, full dependency import reporting including externals, up to 10 decisive snippets. |

Do NOT read entire files. Read only the sections relevant to the goal.

### Step 4: Assemble Handoff

Prefer the bundled extractor for a first-pass handoff, then manually refine only when the goal requires deeper tracing than the index can provide:

```bash
python3 ./scripts/extract_explorer_handoff.py \
  --index data/<repo-name>-index.json \
  --goal "<goal>" \
  --depth standard \
  --budget compact \
  --include-evidence false \
  --target-paths "<target_path>" \
  > /tmp/repo-explorer-handoff.json
```

Validate the final JSON. Use `--input -` for portable stdin, or pass a file path:

```bash
python3 ./scripts/validate_handoff.py --input /tmp/repo-explorer-handoff.json
```

### Step 5: Write Effectiveness Report

After every repo-explorer invocation, save a Markdown effectiveness report in this skill directory:

```text
skills/repo-explorer/repo-explorer-effectiveness-<timestamp>-<repo-key>.md
```

If the native `repo_explorer_explore` tool is used, it writes this report automatically and returns the report path as `effectiveness_report`. If you use the script/manual workflow, create the Markdown report yourself before returning.

The report must summarize:

- target path, goal, depth, budget, and whether evidence was requested
- tracking metadata: schema version, goal category, trace-goal flag, target repo key, and report purpose
- validation status and counts for indexed files, key files, symbols, dependencies, explorer limitations, target repository risks, errors, and evidence
- model-visible output counts, approximate output size, omitted item counts, and omission reasons
- improvement signals, improvement candidates, and downstream feedback placeholders for manual post-run notes
- an effectiveness assessment: `effective`, `partial`, `needs-follow-up`, or `failed`
- rationale plus split sections for explorer limitations, target repository risks, errors, validation failures, or invocation failure details

To roll up many per-invocation reports into an improvement Markdown summary, run:

```bash
python3 ./scripts/summarize_effectiveness_reports.py \
  --reports-dir . \
  --output repo-explorer-effectiveness-summary.md
```

### Step 6: Return

Return the validated handoff to the caller and include the effectiveness report path. Do not omit the report path.

---

## Input Schema

The caller provides (explicitly or inferred from natural language):

```json
{
  "goal": "string — what the caller needs to understand",
  "target_paths": ["string — absolute path(s) to explore"],
  "depth": "shallow | standard | deep",
  "budget": "optional — compact | normal | full",
  "includeEvidence": "optional boolean — collect snippet bodies only when needed",
  "constraints": {
    "languages": ["optional — filter by language"],
    "include_patterns": ["optional — glob patterns to include"],
    "exclude_patterns": ["optional — glob patterns to exclude"],
    "max_files": "optional — override default file limit"
  }
}
```

## Output Schema (Strict JSON Contract)

Return exactly this structure. All fields are required unless marked optional.

```json
{
  "schema_version": "1.0",
  "explorer": "pathfinder",
  "timestamp": "ISO-8601",
  "request": {
    "goal": "string — restated goal from caller",
    "target_paths": ["string"],
    "depth": "shallow | standard | deep"
  },
  "index_info": {
    "index_path": "string — path to persistent index used",
    "index_age_seconds": "number — seconds since last refresh",
    "files_indexed": "number — total files in index"
  },
  "task_understanding": "string — 1-3 sentences: what the caller needs and why, as understood by the explorer",
  "key_files": [
    {
      "path": "string — absolute path",
      "role": "string — why this file matters (entry point, config, core module, test, etc.)",
      "language": "string — file language/type",
      "lines": "number — total lines in file",
      "relevance": "high | medium",
      "confidence": "high | medium | low",
      "confidence_reason": "string — why this confidence level was assigned"
    }
  ],
  "relevant_symbols": [
    {
      "name": "string — function, class, type, or constant name",
      "kind": "function | class | type | constant | module | trait | interface",
      "file": "string — absolute path",
      "line_start": "number",
      "line_end": "number",
      "why": "string — why this symbol matters for the goal",
      "confidence": "high | medium | low",
      "confidence_reason": "string — why this confidence level was assigned"
    }
  ],
  "dependency_map": [
    {
      "source": "string — module or file that depends",
      "target": "string — module or file it depends on",
      "kind": "import | call | config | build"
    }
  ],
  "risks_and_unknowns": [
    {
      "description": "string — what is risky or unknown",
      "severity": "high | medium | low",
      "affected_files": ["string — paths"]
    }
  ],
  "next_actions_for_caller": [
    {
      "action": "string — concrete next step the caller should take",
      "target_agent": "string | null — which agent should handle it (null = caller themselves)",
      "priority": "high | medium | low"
    }
  ],
  "evidence": [
    {
      "file": "string — absolute path",
      "line_start": "number",
      "line_end": "number",
      "snippet": "string — relevant code (max 20 lines)",
      "context": "string — why this snippet is included",
      "confidence": "high | medium | low",
      "confidence_reason": "string — why this confidence level was assigned"
    }
  ],
  "errors": [
    {
      "code": "string — error code (insufficient_scope | index_stale | no_match | redacted_secret | budget_exceeded)",
      "message": "string — human-readable explanation"
    }
  ],
  "omitted": {
    "key_files": "optional number — ranked file candidates omitted by budget",
    "relevant_symbols": "optional number — ranked symbol candidates omitted by budget/diversity caps",
    "dependency_map": "optional number — dependency edges omitted by budget",
    "evidence": "optional number — evidence snippets omitted by budget or because evidence was not requested",
    "reasons": ["optional strings such as budget, symbol-diversity, user-did-not-request-evidence"]
  },
  "explorer_limitations": [
    {
      "code": "optional string — machine-readable limitation code, e.g. dependency_trace_empty",
      "message": "optional string — human-readable limitation",
      "severity": "optional high | medium | low"
    }
  ]
}
```

## Hard Limits

These limits are non-negotiable and enforced by the handoff validator:

| Field | Max Items | Notes |
|---|---|---|
| `key_files` | 25 | Prioritize by relevance to goal |
| `relevant_symbols` | 30 | Include only symbols the caller will need |
| `dependency_map` | 20 | Focus on goal-relevant dependency chains |
| `evidence` | 15 | Each snippet max 20 lines |
| `risks_and_unknowns` | 10 | Only substantive risks, not trivial warnings |
| `next_actions_for_caller` | 8 | Actionable and specific |

If raw exploration yields more items than the active budget or hard limit, rank by relevance to the stated goal, keep only the top items, and record counts/reasons in top-level `omitted` metadata. Use `budget_exceeded` only for legacy compatibility or when truncation itself prevents a useful handoff; ordinary bounded omission is not an explorer error.

## Redaction Rules

Before returning the handoff, scan all string fields for:
- API keys, tokens, passwords (patterns: `sk-`, `ghp_`, `AKIA`, `Bearer`, `token=`, password-like strings)
- Connection strings with credentials
- Private key material

Replace any matches with `[REDACTED]` and add a `redacted_secret` error entry.

## Error Codes

| Code | When |
|---|---|
| `insufficient_scope` | Target path doesn't exist or is inaccessible |
| `index_stale` | Index is older than 24 hours; results may be outdated |
| `no_match` | No files or symbols match the exploration goal |
| `redacted_secret` | Sensitive values were found and redacted |
| `budget_exceeded` | Legacy/blocking truncation case; ordinary bounded omission should be recorded in `omitted` instead |

## Safety

- Do not read entire repositories into context; use the index, targeted reads, and bounded evidence snippets.
- Redact secrets before returning handoffs or writing effectiveness reports.
- Effectiveness reports are local Markdown artifacts written under `skills/repo-explorer/`; they must not include raw secret values.
- Do not run destructive commands while exploring; use read-only indexing, search, and validation commands.

## Verification

After changing this skill or its helper scripts, run:

```bash
python -m unittest discover -s pi-skill-repo-explorer/skills/repo-explorer/tests
```

Before enabling or publishing changes, also run the Pi skill evaluator when available:

```bash
skill_eval_run pi-skill-repo-explorer/skills/repo-explorer/SKILL.md
```
