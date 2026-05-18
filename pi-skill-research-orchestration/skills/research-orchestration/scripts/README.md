# Research orchestration scout scripts

Helper scripts bundled with `@firstpick/pi-skill-research-orchestration`.

Run from this directory, or pass absolute paths.

## Scripts

- `scout_query_plan.py` — create deterministic query plans from topic/task class/facets.
- `scout_normalize_sources.py` — normalize, deduplicate, and sort source records.
- `scout_evidence_bundle.py` — convert append-only fetch JSONL into a stable evidence bundle.
- `scout_citation_audit.py` — verify key findings cite sources or are explicitly exempt.

## Default policy

All scripts use `./policy.json` by default. Pass `--policy /path/to/policy.json` to override.

## Examples

```bash
python3 ./scout_query_plan.py --topic "local-first AI notes" --task-class standard -o query-plan.json
python3 ./scout_normalize_sources.py --input sources.json -o normalized-sources.json
python3 ./scout_evidence_bundle.py --input fetch-records.jsonl -o evidence_bundle.json
python3 ./scout_citation_audit.py --report final-report.json
```
