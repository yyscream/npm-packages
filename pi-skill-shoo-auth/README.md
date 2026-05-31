# @firstpick/pi-skill-shoo-auth

A Pi skill for evaluating, implementing, reviewing, and debugging Shoo auth (`shoo.dev`) Google sign-in in browser apps.

## What it does

- Adds the `shoo-auth` skill to Pi's skill library.
- Guides agents through deterministic fit checks for Shoo versus other auth systems.
- Covers React (`@shoojs/react`), vanilla/framework-agnostic (`@shoojs/auth`), hosted `shoo.js`, Next.js callback routing, Convex custom JWT integration, session/revocation checks, and server-side `id_token` verification.
- Bundles `skills/shoo-auth/SKILL.md` and `skills/shoo-auth/references/shoo-docs-summary.md`.

## Install

```bash
pi install npm:@firstpick/pi-skill-shoo-auth
```

## Configuration

No required Pi configuration.

Shoo implementation tasks may require project-specific app origins, callback paths, and a server runtime that can verify JWTs against Shoo's JWKS endpoint.

## Commands

None.

## Tools

None.

## Test

```bash
npm test
```

## Example view

```text
User: Add Shoo sign-in to this React app and verify tokens server-side.
Agent: Invokes the `shoo-auth` skill, chooses the React path, adds callback handling, and enforces server-side JWT verification.
```
