---
name: tech-deep-dive
description: Agents should invoke this skill when choosing or evaluating libraries, frameworks, tools, platforms, models, databases, APIs, or architectures for a use case. Produces criteria scoring, ecosystem assessment, and recommendations.
---

# Technology Deep Dive

Evaluate and compare technologies for specific use cases.

If the requesting agent provides a fixed output contract, keep this evaluation process but deliver the final result in the requested structure instead of the default markdown sections below.

## Depth and sources per candidate

| Depth | When to use | Minimum distinct sources per candidate |
|-------|-------------|----------------------------------------|
| **Standard** | Typical pick-one or compare-a-few decision | **≥ 3** (e.g. official docs + registry + one independent benchmark or reputable article) |
| **Deep** | High impact, contentious options, or regulatory/security-sensitive choice | **≥ 8** across docs, issues, benchmarks, adoption signals, and primary references |

If sources fall short, say so explicitly under each candidate and in the recommendation — do not pad with duplicate pages from the same site.

## Parallel evaluation

- After Step 2, **plan one stream per candidate** (or per evaluation axis if fewer round-trips: e.g. all “license + maintenance” queries in one batch, then all “performance” queries).
- Run streams **in parallel** when the runtime allows: batch `web_search` / `web_fetch` per candidate rather than finishing A completely before starting B.
- **Merge only in Step 4** — scoring tables and narrative per candidate should be complete before the side-by-side comparison; resolve contradictions during merge.
- Optional: delegate **worker-sized** shards (one candidate, fixed headings) via subagents when OpenClaw supports it; the lead turn owns Step 4–5.

## Evaluation Criteria

Score each technology on these dimensions (1-5 scale):

| Criterion | What to Assess |
|---|---|
| Fitness for purpose | Does it solve the actual problem? How well? |
| Maturity | Stable releases, battle-tested, production users |
| Ecosystem | Documentation, community, plugins/extensions, examples |
| Maintenance health | Recent commits, release cadence, maintainer count |
| Performance | Benchmarks, known performance characteristics |
| API quality | Ergonomics, type safety, error handling, learning curve |
| Integration | Compatibility with current stack (Rust, TS, Python) |
| License | OSS license compatibility, commercial restrictions |

## Process

### Step 1 — Define the Decision

What exactly are we choosing? What problem does it solve?

```markdown
**Decision:** Which [category] to use for [purpose] in [project/context]
**Constraints:** [Must support X, must be OSS, must work with Y]
**Current approach:** [What we're doing now, if anything]
```

### Step 2 — Identify Candidates

- Search package registries (crates.io, npm, PyPI)
- Check "awesome-*" lists on GitHub
- Search for comparison blog posts and benchmarks
- Check official documentation recommendations

### Step 3 — Evaluate Each Candidate (parallel streams)

For each candidate, produce the block below. Gather evidence **in parallel** across candidates (see Parallel evaluation), then fill each block before Step 4.

For each candidate:

```markdown
### [Library Name]

**Version:** X.Y.Z | **License:** MIT | **Stars:** 5.2k | **Last release:** 2026-01-15

**Scores:**
| Criterion | Score | Notes |
|---|---|---|
| Fitness | 4/5 | Covers 90% of use case, missing X |
| Maturity | 5/5 | v3.x, used by [notable projects] |
| Ecosystem | 3/5 | Good docs, small community |
| Maintenance | 4/5 | Monthly releases, 3 maintainers |
| Performance | 4/5 | [benchmark reference] |
| API quality | 5/5 | Excellent types, good error handling |
| Integration | 4/5 | Works with our stack, minor adaptation needed |
| License | 5/5 | MIT, no restrictions |

**Strengths:** [What it does well]
**Weaknesses:** [Where it falls short]
**Risk factors:** [Maintenance, breaking changes, vendor lock-in]
```

### Step 4 — Compare (merge)

Synthesize parallel streams into one view. Side-by-side comparison table:

```markdown
| Criterion | Option A | Option B | Option C |
|---|---|---|---|
| Fitness | 4/5 | 3/5 | 5/5 |
| Maturity | 5/5 | 4/5 | 2/5 |
| ... | ... | ... | ... |
| **Total** | **33/40** | **28/40** | **30/40** |
```

### Step 5 — Recommend

```markdown
## Recommendation

**Pick: [Option A]**

**Rationale:** [Why this is the best fit given the constraints]
**Trade-offs:** [What we give up by not choosing alternatives]
**Migration path:** [If switching from current approach, what's involved]
**Risk mitigation:** [How to handle the identified risks]
```

---

_Scout skill — Technology evaluation and comparison · P1 parallel + source floors: 2026-04-10_
