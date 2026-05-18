# @firstpick/pi-skill-bug-reporter

Pi skill package for `bug-reporter`.

## What it does

- Adds the `bug-reporter` skill to Pi's skill library.
- Guides agents to invoke the skill when defects, regressions, failed tests, unexpected behavior, or spec mismatches are found. Produces structured reproducible bug reports with severity, evidence, environment, and actionable next steps.
- Bundles `skills/bug-reporter/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-bug-reporter
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `bug-reporter`.
Agent: Invokes the `bug-reporter` skill, follows its workflow, and reports the result.
```

Agents should invoke this skill when defects, regressions, failed tests, unexpected behavior, or spec mismatches are found. Produces structured reproducible bug reports with severity, evidence, environment, and actionable next steps.
