# @firstpick/pi-skill-research-orchestration

A Pi skill for broad multi-claim research projects needing planning, parallel investigation, source merging, gap closure, citation audit, and final synthesis when narrower research skills are insufficient.

## What it does

- Adds the `research-orchestration` skill to Pi's skill library.
- Guides agents to invoke the skill for broad multi-claim research projects needing planning, parallel investigation, source merging, gap closure, citation audit, and final synthesis when narrower research skills are insufficient.
- Bundles `skills/research-orchestration/SKILL.md` plus any supporting references, scripts, tests, fixtures, or assets used by the skill.

## Install

```bash
pi install npm:@firstpick/pi-skill-research-orchestration
```

## Configuration

No required configuration.

## Bundled helper scripts

This package ships the `research-orchestration` skill plus its scout helper scripts:

```text
skills/research-orchestration/
  SKILL.md
  scripts/
    README.md
    policy.json
    scout_query_plan.py
    scout_normalize_sources.py
    scout_evidence_bundle.py
    scout_citation_audit.py
    _lib/
      normalize.py
```

Run helpers from `skills/research-orchestration/` or use absolute paths. By default, scripts read `./scripts/policy.json`; pass `--policy /path/to/policy.json` to override.

Examples:

```bash
python3 ./scripts/scout_query_plan.py --topic "local-first AI notes" --task-class standard -o query-plan.json
python3 ./scripts/scout_normalize_sources.py --input sources.json -o normalized-sources.json
python3 ./scripts/scout_evidence_bundle.py --input fetch-records.jsonl -o evidence_bundle.json
python3 ./scripts/scout_citation_audit.py --report final-report.json
```

## Commands

None.

## Tools

None.

## Example view

```text
User: Review this change for the concerns covered by `research-orchestration`.
Agent: Invokes the `research-orchestration` skill, follows its workflow, and reports the result.
```
