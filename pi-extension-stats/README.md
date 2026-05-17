# pi-extension-stats

Token and cost analytics for Pi session history.

![Token stats dashboard](images/stats_v0.1.2.png)

## What it does

- Parses local Pi session `.jsonl` files for the current workspace.
- Aggregates usage by UTC day.
- Displays compact daily token bars and cost bars with totals.
- Shows input/output/cache breakdown, prompt-injection estimate (`PI: X tok`) with source split-up, cache hit rate, estimated cache savings, cost burn rate, and top model usage.
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
- `/stats-pi` — show prompt-injection token breakdown.
- `/stats-last [days|all]` — show non-zero daily usage graph.
- `/stats-most-expense [days|all]` — show most expensive sessions.
- `/stats-model-compare [days|all]` — show model token/cost comparison.
- `/stats-cost-trend [days|all]` — show cost trend and projections.
- `/stats-cache [days|all]` — show cache efficiency and token mix.

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
