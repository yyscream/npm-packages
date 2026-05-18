# @firstpick/pi-skill-performance-optimizer

A Pi skill for slow code, high CPU/memory, latency, large data processing, algorithmic complexity, profiling plans, benchmarks, or optimization requests. Profiles first and weighs trade-offs before changing code.

## What it does

- Adds the `performance-optimizer` skill to Pi's skill library.
- Guides agents to invoke the skill for slow code, high CPU/memory, latency, large data processing, algorithmic complexity, profiling plans, benchmarks, or optimization requests. Profiles first and weighs trade-offs before changing code.
- Bundles `skills/performance-optimizer/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-performance-optimizer
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `performance-optimizer`.
Agent: Invokes the `performance-optimizer` skill, follows its workflow, and reports the result.
```
