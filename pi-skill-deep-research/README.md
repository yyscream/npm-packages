# @firstpick/pi-skill-deep-research

A Pi skill for high-stakes or complex research needing multi-source evidence, scientific/technical fact-checking, decision traces, or rigorous verification. Runs deterministic two-phase research with schema/policy validation.

## What it does

- Adds the `deep-research` skill to Pi's skill library.
- Guides agents to invoke the skill for high-stakes or complex research needing multi-source evidence, scientific/technical fact-checking, decision traces, or rigorous verification. Runs deterministic two-phase research with schema/policy validation.
- Bundles `skills/deep-research/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-deep-research
```

## Configuration

No required configuration.

## Expected usage structure

The skill bundles deterministic research policy, schema, state, tests, and a runner script. Agents should resolve these paths relative to the installed skill directory.

Bundled layout:

```text
skills/deep-research/
  SKILL.md
  policy.json
  output-schema.json
  state.json
  scripts/
    run_deep_research.py
  tests/
    test_determinism.py
```

When following the skill manually, run from `skills/deep-research/` or use absolute paths:

```bash
cd /path/to/installed/package/skills/deep-research
python3 ./scripts/run_deep_research.py \
  --policy ./policy.json \
  --schema ./output-schema.json \
  --state ./state.json \
  --input /path/to/input.json \
  --output /path/to/output.json
```

The packaged `state.json` is intended as skill-local run state. If you want project-local history instead, copy it into the project and pass that copied path with `--state`.

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `deep-research`.
Agent: Invokes the `deep-research` skill, follows its workflow, and reports the result.
```
