# @firstpick/pi-skill-test-plan-generator

Pi skill package for `test-plan-generator`.

## What it does

- Adds the `test-plan-generator` skill to Pi's skill library.
- Guides agents to invoke the skill when planning tests from specs, architecture docs, PRs, risky changes, new features, bug fixes, or release work. Generates prioritized unit, integration, E2E, regression, and edge-case coverage.
- Bundles `skills/test-plan-generator/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-test-plan-generator
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `test-plan-generator`.
Agent: Invokes the `test-plan-generator` skill, follows its workflow, and reports the result.
```

Agents should invoke this skill when planning tests from specs, architecture docs, PRs, risky changes, new features, bug fixes, or release work. Generates prioritized unit, integration, E2E, regression, and edge-case coverage.
