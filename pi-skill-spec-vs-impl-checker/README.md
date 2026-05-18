# @firstpick/pi-skill-spec-vs-impl-checker

Pi skill package for `spec-vs-impl-checker`.

## What it does

- Adds the `spec-vs-impl-checker` skill to Pi's skill library.
- Guides agents to invoke the skill when a spec, plan, README, issue, or requirement must be verified against implementation. Traces requirements to code, checks interface contracts, and reports gaps or mismatches.
- Bundles `skills/spec-vs-impl-checker/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-spec-vs-impl-checker
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `spec-vs-impl-checker`.
Agent: Invokes the `spec-vs-impl-checker` skill, follows its workflow, and reports the result.
```

Agents should invoke this skill when a spec, plan, README, issue, or requirement must be verified against implementation. Traces requirements to code, checks interface contracts, and reports gaps or mismatches.
