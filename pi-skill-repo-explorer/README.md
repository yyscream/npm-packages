# @firstpick/pi-skill-repo-explorer

A Pi skill for use before modifying unfamiliar codebases, answering where/how something is implemented, tracing dependencies, mapping repo structure, or planning changes. Explores a repository and returns a strict JSON handoff with key files, symbols, risks, and evidence.

## What it does

- Adds the `repo-explorer` skill to Pi's skill library.
- Guides agents to invoke the skill before modifying unfamiliar codebases, answering where/how something is implemented, tracing dependencies, mapping repo structure, or planning changes. Explores a repository and returns a strict JSON handoff with key files, symbols, risks, and evidence.
- Bundles `skills/repo-explorer/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

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
python3 ./scripts/validate_handoff.py --input /dev/stdin
```

The target repository can be any readable local directory. The generated `data/` index directory is local scratch state and does not need to exist before first use.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `repo-explorer`.
Agent: Invokes the `repo-explorer` skill, follows its workflow, and reports the result.
```
