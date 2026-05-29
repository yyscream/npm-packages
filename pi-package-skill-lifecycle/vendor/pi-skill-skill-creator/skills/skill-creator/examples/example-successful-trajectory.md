# Example successful trajectory: repeatable changelog cleanup

## Situation

A Pi package README and `package.json` description drifted after three similar maintenance updates.

## Successful procedure

1. Read the package `README.md`, `package.json`, and primary `SKILL.md`.
2. Identify the canonical behavior from the implementation or tests.
3. Update duplicated package descriptions to match the canonical behavior.
4. Run the package's existing test command.
5. Report modified files and verification output.

## Verification that worked

`npm test` passed after the description cleanup.

## Reusability evidence

This pattern appeared in three Pi skill package maintenance tasks and is likely to recur when package metadata changes.
