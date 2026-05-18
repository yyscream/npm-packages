# @firstpick/pi-skill-acceptance-tester

Pi skill package for `acceptance-tester`.

## What it does

- Adds the `acceptance-tester` skill to Pi's skill library.
- Guides agents to invoke the skill as the final gate before release, handoff, or claiming completion for substantial changes. Runs acceptance/readiness checks, determines pass/fail, and gives a go/no-go recommendation.
- Bundles `skills/acceptance-tester/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-acceptance-tester
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `acceptance-tester`.
Agent: Invokes the `acceptance-tester` skill, follows its workflow, and reports the result.
```

Agents should invoke this skill as the final gate before release, handoff, or claiming completion for substantial changes. Runs acceptance/readiness checks, determines pass/fail, and gives a go/no-go recommendation.
