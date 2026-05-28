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

If the `repo_explorer_explore` tool is available, call it first with `budget: "compact"`. It wraps index refresh/build, extraction, validation, and compact output in one tool call.

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

Do NOT read entire files. Read only the sections relevant to the goal.

### Step 4: Assemble Handoff

Prefer the bundled extractor for a first-pass handoff, then manually refine only when the goal requires deeper tracing than the index can provide:

```bash
python3 ./scripts/extract_explorer_handoff.py \
  --index data/<repo-name>-index.json \
  --goal "<goal>" \
  --depth standard \
  --target-paths "<target_path>" \
  > /tmp/repo-explorer-handoff.json
```

Validate the final JSON. Use `--input -` for portable stdin, or pass a file path:

```bash
python3 ./scripts/validate_handoff.py --input /tmp/repo-explorer-handoff.json
```

### Step 5: Return

Return ONLY the JSON object. No markdown wrapping, no prose before or after, no explanations outside the JSON structure.

---

## Input Schema

The caller provides (explicitly or inferred from natural language):

```json
{
  "goal": "string — what the caller needs to understand",
  "target_paths": ["string — absolute path(s) to explore"],
  "depth": "shallow | standard | deep",
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
      "relevance": "high | medium"
    }
  ],
  "relevant_symbols": [
    {
      "name": "string — function, class, type, or constant name",
      "kind": "function | class | type | constant | module | trait | interface",
      "file": "string — absolute path",
      "line_start": "number",
      "line_end": "number",
      "why": "string — why this symbol matters for the goal"
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
      "context": "string — why this snippet is included"
    }
  ],
  "errors": [
    {
      "code": "string — error code (insufficient_scope | index_stale | no_match | redacted_secret | budget_exceeded)",
      "message": "string — human-readable explanation"
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

If raw exploration yields more items than the limit, rank by relevance to the stated goal and keep only the top items. Add a `budget_exceeded` error entry noting what was trimmed.

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
| `budget_exceeded` | Results were trimmed to fit hard limits |
