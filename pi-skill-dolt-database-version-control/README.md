# @firstpick/pi-skill-dolt-database-version-control

A portable Agent Skill / Pi package for researching, evaluating, and applying [Dolt](https://github.com/dolthub/dolt), the Git-like version-controlled SQL database.

## What it does

- Adds the `dolt-database-version-control` skill to Pi's skill library.
- Guides agents through how, when, why, and where to use Dolt for database branching, merging, diffs, rollback, audit history, and versioned MySQL replica workflows.
- Includes a source-backed Dolt reference guide at `skills/dolt-database-version-control/references/dolt-guide.md`.
- Bundles contract tests for frontmatter, required sections, and reference integrity.

## Install

```bash
pi install npm:@firstpick/pi-skill-dolt-database-version-control
```

## Configuration

No required configuration.

The skill may ask to verify current Dolt details from official docs before making version-, platform-, or production-readiness claims.

## Commands

None.

## Tools

None.

## Development checks

```bash
npm test
npm pack --dry-run
```

`npm test` requires Python 3 and uses only the standard library.

## Example view

```text
User: Should we use Dolt for branchable customer configuration data?
Agent: Invokes `dolt-database-version-control`, checks the use case against Dolt fit criteria, proposes an adoption shape, lists risks, and recommends validation steps.
```
