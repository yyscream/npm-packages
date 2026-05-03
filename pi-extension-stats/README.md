# pi-extension-stats

Token and cost analytics for Pi session history.

## What it does

- Parses local Pi session `.jsonl` files for the current workspace.
- Aggregates usage by UTC day.
- Displays compact daily token bars with totals.
- Shows input/output/cache breakdown and top model usage.

## Install

```bash
pi install npm:@firstpick/pi-extension-stats
```

## Configuration

No required configuration.

## Commands

- `/stats` — show last 14 days.
- `/stats <days>` — show last N days.
- `/stats all` — show all available days.

## Tools

None.
