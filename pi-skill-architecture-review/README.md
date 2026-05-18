# @firstpick/pi-skill-architecture-review

Pi skill package for `architecture-review`.

## What it does

- Adds the `architecture-review` skill to Pi's skill library.
- Guides agents to invoke the skill for architecture reviews, module boundaries, dependency direction, coupling/cohesion, SOLID concerns, system design trade-offs, layering, service boundaries, or design decisions before implementation.
- Bundles `skills/architecture-review/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-architecture-review
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `architecture-review`.
Agent: Invokes the `architecture-review` skill, follows its workflow, and reports the result.
```

Agents should invoke this skill for architecture reviews, module boundaries, dependency direction, coupling/cohesion, SOLID concerns, system design trade-offs, layering, service boundaries, or design decisions before implementation.
