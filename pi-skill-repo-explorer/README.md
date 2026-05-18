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

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `repo-explorer`.
Agent: Invokes the `repo-explorer` skill, follows its workflow, and reports the result.
```
