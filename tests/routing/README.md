# Development Routing Fixtures

These fixtures are **development/evaluation data**, not production runtime resources. Pi does not need this directory to load or run published packages.

Use them to regression-test routing boundaries for this repository's skills or for an explicitly supplied target skill set. The validator is intentionally schema-only by default so it does not read a maintainer's personal Pi config.

## Schema

Each fixture is named after the skill:

```text
tests/routing/<skill-name>.json
```

Required fields:

- `skill`: skill name; must match the file stem.
- `should_trigger`: at least three prompts that should route to the skill.
- `should_not_trigger`: at least three prompts that should not route to the skill.

Optional fields:

- `ambiguous`: reviewed boundary prompts with `candidate_skills`, `decision`, `reason`, and `review_status`.
- `notes`: short author notes for future evaluator integration.

## Validation

Schema-only validation, no Pi config access:

```bash
node dev/scripts/validate-skill-routing-fixtures.mjs
```

Coverage validation against explicit targets:

```bash
node dev/scripts/validate-skill-routing-fixtures.mjs --skill-root ./pi-package-skill-lifecycle/vendor
node dev/scripts/validate-skill-routing-fixtures.mjs --settings /path/to/pi-agent/settings.json
```

The validator:

1. Validates all `tests/routing/*.json` fixture schemas.
2. Optionally resolves explicit `--settings` or `--skill-root` targets.
3. Requires a fixture for every explicit target skill when targets are provided.
4. Checks trigger/not-trigger counts and ambiguous prompt review metadata.
5. Reports likely overlapping skill descriptions for routing review when target skills are provided.

Published packages should bundle only package-relevant routing fixtures under their own skill `tests/` or `references/` directories. Repository-level `tests/routing/` stays development-only.
