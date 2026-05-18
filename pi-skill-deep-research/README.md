# @firstpick/pi-skill-deep-research

Pi skill package for `deep-research`.

## What it does

- Adds the `deep-research` skill to Pi's skill library.
- Guides agents to invoke the skill for high-stakes or complex research needing multi-source evidence, scientific/technical fact-checking, decision traces, or rigorous verification. Runs deterministic two-phase research with schema/policy validation.
- Bundles `skills/deep-research/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-deep-research
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `deep-research`.
Agent: Invokes the `deep-research` skill, follows its workflow, and reports the result.
```

Agents should invoke this skill for high-stakes or complex research needing multi-source evidence, scientific/technical fact-checking, decision traces, or rigorous verification. Runs deterministic two-phase research with schema/policy validation.
