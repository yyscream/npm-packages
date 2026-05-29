# @firstpick/pi-skill-skill-creator

Pi-native workflow and tools for drafting reusable Agent Skills from repeated successful work.

## What it does

- Adds the `skill-creator` skill to Pi's skill library.
- Adds read/write tools for drafting skills only after a reusability gate is satisfied.
- Writes drafts outside Pi's auto-discovered skill roots by default: `~/.pi/agent/drafts/skills/<skill-name>/`.
- Can optionally create a package skeleton: `pi-skill-<skill-name>/skills/<skill-name>/SKILL.md`.
- Never enables the generated skill automatically.
- Bundles the portable skill authoring guide at `skills/skill-creator/references/SKILL-PORTABILITY.md` so published npm packages remain self-contained.

## Install

This is vendored inside `@firstpick/pi-package-skill-lifecycle`; install the parent package:

```bash
pi install npm:@firstpick/pi-package-skill-lifecycle
```

## Tools

- `skill_create_draft`: create a draft from inline source notes or a source file.
- `skill_create_from_notes`: create a draft from a successful-trajectory notes file.
- `skill_create_from_patch`: create a draft from a `PATCH.md`-style source artifact.

All tools require explicit reusability evidence. Draft creation is blocked when the workflow is neither repeated, expensive, nor strategically reusable.

For portability rules, see `skills/skill-creator/references/SKILL-PORTABILITY.md` in this package.

## CLI usage

```bash
cd pi-package-skill-lifecycle/vendor/pi-skill-skill-creator/skills/skill-creator
node ./scripts/skill_create_draft.mjs \
  --name example-repeatable-workflow \
  --source-notes ./examples/example-successful-trajectory.md \
  --reusability repeated-3-plus \
  --reusability-evidence "Used successfully for three similar cleanup tasks." \
  --with-tests \
  --json
```

Package skeleton:

```bash
node ./scripts/skill_create_draft.mjs \
  --name example-repeatable-workflow \
  --source-notes ./examples/example-successful-trajectory.md \
  --reusability strategic-reuse \
  --reusability-evidence "Likely to recur across Pi package maintenance tasks." \
  --package-skeleton \
  --output /tmp/pi-skill-example-repeatable-workflow \
  --with-tests
```

## Safety note

`~/.pi/agent/skills/` is an auto-discovered skill root in Pi. Writing drafts under `~/.pi/agent/skills/drafts/` would make draft skills discoverable before review. This package intentionally defaults to `~/.pi/agent/drafts/skills/` instead and refuses discovered skill roots unless explicitly overridden.
