# @firstpick/pi-skill-code-quality

A Pi skill for code reviews, linting/formatting setup, maintainability checks, complexity concerns, warning cleanup, coding standards, or quality gates in Rust, TypeScript, Python, shell, and mixed repos.

## What it does

- Adds the `code-quality` skill to Pi's skill library.
- Guides agents to invoke the skill for code reviews, linting/formatting setup, maintainability checks, complexity concerns, warning cleanup, coding standards, or quality gates in Rust, TypeScript, Python, shell, and mixed repos.
- Bundles `skills/code-quality/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-code-quality
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `code-quality`.
Agent: Invokes the `code-quality` skill, follows its workflow, and reports the result.
```
