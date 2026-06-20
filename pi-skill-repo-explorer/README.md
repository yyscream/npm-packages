# @firstpick/pi-skill-repo-explorer

A Pi skill for use before modifying unfamiliar codebases, answering where/how something is implemented, tracing dependencies, mapping repo structure, or planning changes. Explores a repository and returns a strict JSON handoff with key files, symbols, risks, and evidence.

## What it does

- Adds the `repo-explorer` skill to Pi's skill library.
- Adds the `repo_explorer_explore` tool for cached, validated, compact repository exploration.
- Guides agents to invoke the skill/tool before modifying unfamiliar codebases, answering where/how something is implemented, tracing dependencies, mapping repo structure, or planning changes.
- Bundles `skills/repo-explorer/SKILL.md`, `extensions/repo-explorer.ts`, and supporting scripts/tests.

## Install

```bash
pi install npm:@firstpick/pi-skill-repo-explorer
```

## Configuration

No required configuration.

## Expected usage structure

The skill is a workflow plus bundled helper scripts. It expects the agent to resolve paths relative to the installed skill directory before running helpers.

Bundled layout:

```text
skills/repo-explorer/
  SKILL.md
  scripts/
    build_repo_index.py
    extract_explorer_handoff.py
    refresh_repo_index.py
    validate_handoff.py
```

When following the skill manually, run helper scripts from `skills/repo-explorer/` or pass absolute paths, for example:

```bash
cd /path/to/installed/package/skills/repo-explorer
python3 ./scripts/refresh_repo_index.py --repo /path/to/repo --data-dir data/
python3 ./scripts/build_repo_index.py --repo /path/to/repo --output data/repo-index.json
python3 ./scripts/extract_explorer_handoff.py --index data/repo-index.json --goal "find auth flow" --depth standard --budget compact --include-evidence false > /tmp/repo-explorer-handoff.json
python3 ./scripts/validate_handoff.py --input /tmp/repo-explorer-handoff.json
python3 ./scripts/summarize_effectiveness_reports.py --reports-dir . --output repo-explorer-effectiveness-summary.md
```

The target repository can be any readable local directory. The generated `data/` index directory is local scratch state and does not need to exist before first use.

## Commands

None.

## Tools

- `repo_explorer_explore`: build/refresh a local repo index, extract a budget-aware goal-focused handoff, validate it, write an effectiveness report with omitted counts, improvement signals, downstream feedback placeholders, and limitations, then return compact model-visible results. Defaults to `budget: "compact"` and no evidence snippets.

## Effectiveness tracking

Each native tool invocation writes `skills/repo-explorer/repo-explorer-effectiveness-<timestamp>-<repo-key>.md`. Reports include tracking metadata, improvement signals, candidates, omitted counts, and manual downstream-feedback placeholders. To create a rollup improvement file from all reports:

```bash
python3 skills/repo-explorer/scripts/summarize_effectiveness_reports.py \
  --reports-dir skills/repo-explorer \
  --output skills/repo-explorer/repo-explorer-effectiveness-summary.md
```

## Example view

```text
User: Review this change for the concerns covered by `repo-explorer`.
Agent: Invokes the `repo-explorer` skill, follows its workflow, and reports the result.
```
