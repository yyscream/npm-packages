# @firstpick/pi-skill-refactoring-advisor

A Pi skill for refactors, code smells, migrations, duplication removal, module splitting, API cleanup, or restructuring plans. Emphasizes small safe steps, behavior preservation, and verification after each change.

## What it does

- Adds the `refactoring-advisor` skill to Pi's skill library.
- Guides agents to invoke the skill for refactors, code smells, migrations, duplication removal, module splitting, API cleanup, or restructuring plans. Emphasizes small safe steps, behavior preservation, and verification after each change.
- Bundles `skills/refactoring-advisor/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-refactoring-advisor
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `refactoring-advisor`.
Agent: Invokes the `refactoring-advisor` skill, follows its workflow, and reports the result.
```
