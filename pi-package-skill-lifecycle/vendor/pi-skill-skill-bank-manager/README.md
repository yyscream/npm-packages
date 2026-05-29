# pi-skill-skill-bank-manager

Pi package for read-only lifecycle auditing of the local skill bank.

## Contents

- Skill: `skill-bank-manager`
- Extension tools:
  - `skillbank_audit`
  - `skillbank_find_overlap`
  - `skillbank_prune_plan`
  - `skillbank_run_tests`
- CLI script: `bun scripts/skillbank-audit.ts [/tmp/pi-skill-bank-audit.md]`

## Install / enable

This is vendored inside `@firstpick/pi-package-skill-lifecycle`; install the parent package:

```bash
pi install npm:@firstpick/pi-package-skill-lifecycle
```

## Audit

```bash
cd <package-root>
bun scripts/skillbank-audit.ts /tmp/pi-skill-bank-audit.md
```

By default the report inspects the active Pi agent directory (`PI_CODING_AGENT_DIR` or Pi's standard user agent directory). For portable/package tests, pass explicit `agentDir`, `settingsPath`, or `cwd` options instead of relying on a maintainer's personal Pi config.

The report includes enabled skills from the selected settings file, top-level skill-bank entries under the selected agent skill directory, package provenance, missing tests/scripts/references/validation metadata, likely overlap groups, and plan-only recommendations.

## Safety

The package does not mutate skill files. Prune and merge actions are emitted as plans only. `skillbank_run_tests` defaults to a read-only test plan and executes commands only when `run=true` is explicit.
