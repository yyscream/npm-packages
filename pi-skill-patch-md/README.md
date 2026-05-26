# @firstpick/pi-skill-patch-md

A Pi skill for two patch workflows:

1. **Create/Update PATCH.md** using a fixed, reproducible structure.
2. **Implement PATCH.md** by applying the documented source changes exactly.

## What it does

- Adds the `patch-md` skill to Pi's skill library.
- Enforces one canonical PATCH.md structure.
- Defines a precise tool-call contract (`patch_md_extract`) for parsing PATCH.md into machine-readable execution data.
- Helps agents produce implementation-ready patch docs and execute them safely.

## Install

```bash
pi install npm:@firstpick/pi-skill-patch-md
```

## Configuration

No required configuration.

## Commands

None.

## Tools

Skill-defined contract for integration:

- `patch_md_extract` (recommended tool name)
  - Preferred parser script: `skills/patch-md/scripts/patch_md_extract.mjs`
  - Spec: `skills/patch-md/TOOL-CALL-SPEC.md`
  - Schema: `skills/patch-md/patch-md-tool.schema.json`

Modes:
- Script mode (`--strict`, default) — preferred
- Unstrict mode (`--no-strict`) — fallback for legacy PATCH.md variants

## Example

```text
User: Create PATCH.md for this bugfix and then implement it.
Agent: Invokes patch-md skill, writes standardized PATCH.md, then applies the patch and reports verification.
```
