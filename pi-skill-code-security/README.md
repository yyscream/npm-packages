# @firstpick/pi-skill-code-security

A Pi skill for code security reviews, leaked secret checks, dependency risk, unsafe shell/Python/TypeScript/Rust patterns, auth/input-validation flaws, SAST-style audits, or supply-chain concerns in repositories.

## What it does

- Adds the `code-security` skill to Pi's skill library.
- Guides agents to invoke the skill for code security reviews, leaked secret checks, dependency risk, unsafe shell/Python/TypeScript/Rust patterns, auth/input-validation flaws, SAST-style audits, or supply-chain concerns in repositories.
- Bundles `skills/code-security/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-code-security
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `code-security`.
Agent: Invokes the `code-security` skill, follows its workflow, and reports the result.
```
