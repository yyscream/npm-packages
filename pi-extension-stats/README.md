# pi-extension-stats

Token and cost analytics for Pi session history.

![Token stats dashboard](images/stats_v0.1.2.png)

## What it does

- Parses local Pi session `.jsonl` files for the current workspace.
- Aggregates usage by UTC day.
- Displays compact daily token bars and cost bars with totals.
- Shows input/output/cache breakdown, estimated initial prompt input (`PI: X tok`) with source split-up, cache hit rate, estimated cache savings, cost burn rate, and top model usage.
- Highlights highest-cost day, projected 30-day cost, most expensive sessions, and model cost efficiency.

## Install

```bash
pi install npm:@firstpick/pi-extension-stats
```

## Configuration

No required configuration.

## Commands

- `/stats [days|all]` — show token usage dashboard (default: last 14 days).
- `/stats tokens` — show current context token breakdown by source/type.
- `/stats-pi` — show estimated initial prompt input token breakdown. It counts prompt text with a `chars / 4` heuristic, then applies a `1.5×` multiplier to approximate structured tools/request overhead.
- `/stats-last [days|all]` — show non-zero daily usage graph.
- `/stats-most-expense [days|all]` — show most expensive sessions.
- `/stats-model-compare [days|all]` — show model token/cost comparison.
- `/stats-cost-trend [days|all]` — show cost trend and projections.
- `/stats-cache [days|all]` — show cache efficiency and token mix.

## Prompt input estimate

`/stats-pi` and the `PI: X tok` value in `/stats` estimate the full initial model input, not just raw prompt text.

The calculation is intentionally provider-agnostic:

```text
promptTextTokens = systemPrompt.length / 4
estimatedInitialInput = promptTextTokens × 1.5
structuredOverhead = estimatedInitialInput - promptTextTokens
```

The extra `structuredOverhead` row approximates tokens added by structured tool definitions, request framing, and provider message overhead. It is a calibrated estimate for dashboard use; provider-reported `usage.input` in Pi session JSONL remains the authoritative post-call value.

## Tools

None.

## Example view

```text
/stats 7
Token usage — last 7 days

May 06  in 18k  out 4k   $0.11  ████
May 07  in 42k  out 9k   $0.29  █████████
May 08  in 12k  out 2k   $0.06  ██

Total: 72k input, 15k output, $0.46
Cache hit rate: 38%
```

Use it to understand which days, sessions, and models are driving token volume and cost.
