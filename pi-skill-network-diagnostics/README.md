# @firstpick/pi-skill-network-diagnostics

Pi skill package for `network-diagnostics`.

## What it does

- Adds the `network-diagnostics` skill to Pi's skill library.
- Guides agents to invoke the skill for connectivity, DNS, Pi-hole, port reachability, routing, firewall reachability, TLS/network timeouts, or service access failures. Provides structured network troubleshooting commands and interpretation.
- Bundles `skills/network-diagnostics/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-network-diagnostics
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `network-diagnostics`.
Agent: Invokes the `network-diagnostics` skill, follows its workflow, and reports the result.
```

Agents should invoke this skill for connectivity, DNS, Pi-hole, port reachability, routing, firewall reachability, TLS/network timeouts, or service access failures. Provides structured network troubleshooting commands and interpretation.
