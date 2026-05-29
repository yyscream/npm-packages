# pi-skill-skill-refinement-loop

Pi skill + extension for turning skill failures, user corrections, and failed skill tests into structured refinement proposals.

## What it provides

- `skill-refinement-loop` skill documentation.
- `skill_refinement_plan` tool.
- Append-only per-skill memory at `~/.pi/agent/memory/skills/<skill>.md`.
- PATCH.md-style proposal output, defaulting to `/tmp/skill-refinement-<skill>-<timestamp>.md`.
- Safe fallback when a dedicated skill evaluator is not installed.

## Install

This is vendored inside `@firstpick/pi-package-skill-lifecycle`; install the parent package:

```bash
pi install npm:@firstpick/pi-package-skill-lifecycle
```

For local development, add the package through the existing Pi package/symlink workflow; do not directly install from this repository into Pi's global npm prefix.

## Example

```text
skill_refinement_plan(
  skill="repo-explorer",
  failure="The skill should have used includeEvidence=true because exact code citations were requested.",
  evidence=["User correction after compact repo-explorer output omitted exact snippets."],
  rootCauseHypothesis="Workflow did not require includeEvidence=true for citation-heavy prompts.",
  patchSummary="Update repo-explorer workflow instructions and add a regression fixture.",
  regressionTest="Add a contract test for citation-heavy prompts."
)
```

## Safety model

The tool does not edit production skill behavior. It only writes:

1. A short append-only per-skill memory note.
2. A proposal file.

Applying the proposal remains a separate reviewed step.

## Test

```bash
bun tests/mocktest.ts
```
