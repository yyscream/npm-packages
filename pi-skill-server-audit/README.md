# @firstpick/pi-skill-server-audit

Pi skill package for `server-audit`.

## What it does

- Adds the `server-audit` skill to Pi's skill library.
- Guides agents to invoke the skill for Linux server security reviews, SSH hardening, firewall/open-port audits, user/permission checks, exposed services, or host hardening requests. Produces severity-rated findings and practical remediation steps.
- Bundles `skills/server-audit/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-server-audit
```

## Configuration

No required configuration.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `server-audit`.
Agent: Invokes the `server-audit` skill, follows its workflow, and reports the result.
```

Agents should invoke this skill for Linux server security reviews, SSH hardening, firewall/open-port audits, user/permission checks, exposed services, or host hardening requests. Produces severity-rated findings and practical remediation steps.
