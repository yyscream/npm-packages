# @firstpick/pi-skill-backup-manager

A Pi skill for backup health checks, restore testing, NAS/Gitea backup integrity, 3-2-1 strategy review, backup script audits, or verifying repositories and archives can be restored safely.

## What it does

- Adds the `backup-manager` skill to Pi's skill library.
- Guides agents to invoke the skill for backup health checks, restore testing, NAS/Gitea backup integrity, 3-2-1 strategy review, backup script audits, or verifying repositories and archives can be restored safely.
- Bundles `skills/backup-manager/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-backup-manager
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `backup-manager`.
Agent: Invokes the `backup-manager` skill, follows its workflow, and reports the result.
```
