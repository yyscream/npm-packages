# @firstpick/pi-skill-tech-debt-tracker

A Pi skill for tasks involving identifying, categorizing, prioritizing, or planning technical debt work, debt sprints, cleanup backlogs, TODO consolidation, or long-term maintainability risks. Tracks debt with severity/effort.

## What it does

- Adds the `tech-debt-tracker` skill to Pi's skill library.
- Guides agents to invoke the skill when identifying, categorizing, prioritizing, or planning technical debt work, debt sprints, cleanup backlogs, TODO consolidation, or long-term maintainability risks. Tracks debt with severity/effort.
- Bundles `skills/tech-debt-tracker/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-tech-debt-tracker
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `tech-debt-tracker`.
Agent: Invokes the `tech-debt-tracker` skill, follows its workflow, and reports the result.
```
