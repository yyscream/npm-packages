# @firstpick/pi-skill-deployment-automation

Pi skill package for `deployment-automation`.

## What it does

- Adds the `deployment-automation` skill to Pi's skill library.
- Guides agents to invoke the skill for Docker Compose deployments, container updates, stack health checks, rollbacks, compose-file changes, image upgrades, failed deploys, or service restart planning. Provides safe deployment and rollback workflows.
- Bundles `skills/deployment-automation/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-deployment-automation
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `deployment-automation`.
Agent: Invokes the `deployment-automation` skill, follows its workflow, and reports the result.
```

Agents should invoke this skill for Docker Compose deployments, container updates, stack health checks, rollbacks, compose-file changes, image upgrades, failed deploys, or service restart planning. Provides safe deployment and rollback workflows.
