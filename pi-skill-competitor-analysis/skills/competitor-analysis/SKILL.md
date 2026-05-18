---
name: competitor-analysis
description: Agents should invoke this skill when comparing competing products, services, libraries, tools, vendors, or approaches for market/product positioning, feature matrices, strategic trade-offs, pricing, adoption, or differentiation.
---

# Competitor Analysis

Research competitive landscape and produce actionable comparisons.

## Product stream vs market stream

Split investigation to mirror parallel research patterns; merge before strategic recommendations.

| Stream | Focus | Typical sources |
|--------|--------|-----------------|
| **Product** | Feature matrix, specs, APIs, pricing tables, integrations, release cadence | Official docs, changelogs, pricing pages, registries |
| **Market** | Positioning, messaging, ICP, reviews, sentiment, analyst takes, share/narrative | G2/Capterra, HN/Reddit, landing copy, news, reports |

**Execution:** Run both streams **in parallel** (batched searches/fetches per stream) when possible. If using subagents, assign **one stream per worker** with a fixed handoff schema (bullets + URLs); one synthesis pass produces Steps 3–6 below.

## Process

### Step 1 — Define Scope

```markdown
**Subject:** [What product/feature we're analyzing]
**Competitors to evaluate:** [Specific names, or "discover competitors"]
**Purpose:** [What decision this informs]
**Dimensions:** [Features, pricing, UX, performance, target audience]
```

### Step 2 — Discover Competitors

Assign discovery to **both** streams: product-side (direct substitutes, OSS alternatives) and market-side (who buyers compare you to in reviews and “vs” articles).

If competitors aren't specified:

- Search for "[category] alternatives"
- Check comparison sites (G2, AlternativeTo, Product Hunt)
- Search GitHub for open-source alternatives
- Check Hacker News and Reddit for community recommendations
- Review industry reports and analyst coverage

### Step 3 — Feature Matrix (product stream)

```markdown
## Feature Comparison

| Feature | Our Product | Competitor A | Competitor B | Competitor C |
|---|---|---|---|---|
| [Feature 1] | Yes | Yes | No | Partial |
| [Feature 2] | Planned | Yes | Yes | Yes |
| [Feature 3] | No | No | Yes | No |
| **Pricing** | [model] | [model] | [model] | [model] |
| **Target audience** | [who] | [who] | [who] | [who] |
| **Open source** | Yes/No | Yes/No | Yes/No | Yes/No |
```

### Step 4 — Positioning Analysis (market stream)

For each competitor:

```markdown
### [Competitor Name]

**Positioning:** [How they describe themselves]
**Target audience:** [Who they serve]
**Key differentiator:** [What makes them unique]
**Strengths:** [Where they excel]
**Weaknesses:** [Where they fall short]
**Pricing:** [Model and price points]
**Community/adoption:** [Size, activity, notable users]
**Threat level:** [High / Medium / Low — to our product]
```

### Step 5 — Strategic Insights (merge)

Reconcile product facts with market narrative (e.g. a feature exists but messaging downplays it).

```markdown
## Market Insights

### Gaps in the Market
- [Opportunity that no competitor addresses well]

### Table Stakes
- [Features every competitor has — we need these too]

### Differentiators Available
- [Areas where we can uniquely differentiate]

### Risks
- [Competitive risks to monitor]
```

### Step 6 — Recommendation

```markdown
## Recommendation

Based on the competitive landscape:
1. [Product strategy recommendation]
2. [Feature priority recommendation]
3. [Positioning recommendation]
```

## Source Quality

For competitor analysis, prioritize:
1. Official product pages and documentation
2. Independent reviews (G2, Capterra)
3. Community discussions (Reddit, HN, forums)
4. Blog posts and comparisons (check for bias/sponsorship)

---

_Scout skill — Competitor analysis and market research · P1 product/market streams: 2026-04-10_
