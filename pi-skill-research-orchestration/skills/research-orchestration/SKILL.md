---
name: research-orchestration
description: Agents should invoke this skill for broad multi-claim research projects needing planning, parallel investigation, source merging, gap closure, citation audit, and final synthesis when narrower research skills are insufficient.
---

# Research orchestration

Single workflow entry point for **end-to-end** investigations. Detailed rules live in `workspace-researcher/AGENTS.md` (task class, parallel investigation, Deep Research Protocol, citation audit); this skill is the **ordered checklist** for executing them.

## When to use

- Broad question with **several independent sub-questions** or claim clusters.
- Mixed sources (web + docs + papers) and **one** final report or contract output.
- User or delegating agent asked for **deep research** without pointing at a single comparison or single paper.

Prefer **tech-deep-dive**, **competitor-analysis**, or **paper-summarizer** when the task clearly matches one of those shapes.

## Pipeline

1. **Classify depth** — Quick / standard / deep (`AGENTS.md` task-class table). Honor explicit **quick** / **standard** / **deep** or **`/deep-research` quick|standard|max** when the user names them. Set expected tool budget.
2. **Plan sub-questions** — List facets and claims to verify; note which are **high-stakes** (citation audit mandatory). Prefer **internal → official → web** (`AGENTS.md` data source order) when gathering evidence.
3. **Parallel pass** — Batch `web_search` / `web_fetch` per independent facet; optional subagents with **tight scopes** and structured handoff.
4. **Merge** — One synthesis pass; resolve contradictions; prefer primary sources.
5. **Gap closure** — List unresolved material gaps; targeted follow-up searches or explicit “blocked” notes.
6. **Citation audit** — For mandatory cases: every key finding → source row or `unsupported` / `inferential` (`AGENTS.md`).
7. **Deliver** — Default report shape, contract JSON, or consumer-specific packet from `AGENTS.md`; include **Limitations** and **Research trace** when depth is standard/deep or requested (`APPEND_SYSTEM.md`).
8. **Log** — Append a row to `workspace-researcher/MEMORY.md` → **Research History** (topic, task class, tool bucket, major gaps, notable sources).

## Scout scripts → pipeline step

Run from repo root (or adjust paths). Policy defaults: `workspace-researcher/scripts/policy.json`.

| Step | Script | When |
|------|--------|------|
| After depth + topic fixed | `../../scripts/scout_query_plan.py` | Emit ordered queries (`Q001`…) and `plan_hash` for the research trace |
| After URL collection | `../../scripts/scout_normalize_sources.py` | Dedupe and sort sources before the final table |
| Long / multi-session runs | `../../scripts/scout_evidence_bundle.py` | Freeze fetch records (JSONL → `evidence_bundle.json` + `content_sha256`) |
| Before high-stakes delivery | `../../scripts/scout_citation_audit.py` | Gate: every `key_findings[]` row has `source_ids` or `unsupported` / `inferential` |

Details and exit codes: `workspace-researcher/scripts/README.md`.

## Handoff schema (optional, for subagents)

```markdown
## Scope
[One sentence]

## Findings
- [Bullet + URL]

## Gaps
- [What could not be verified]

## Sources touched
- [Title](URL) — quality flag
```

---

_Scout skill — Orchestrated research pipeline · 2026-04-10_
