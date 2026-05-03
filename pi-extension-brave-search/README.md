# pi-extension-brave-search

Brave Search tool integration for Pi.

## What it does

- Adds the `brave_search` tool for live web search from Pi.
- Returns formatted results plus structured metadata.
- Applies sane limits to keep output stable and context-safe.
- Resolves API key in this order:
  1. `process.env.BRAVE_SEARCH_API_KEY`
  2. `./.env` (current working directory)
  3. `PI_CODING_AGENT_DIR/.env`

## Install

```bash
pi install npm:@firstpick/pi-extension-brave-search
```

## Configuration

- `BRAVE_SEARCH_API_KEY` (required)

## Commands

- `/brave-search-status` — show whether Brave Search is configured and where key resolution succeeded.
- `/brave-search-test <query>` — run a direct test query.

## Tools

- `brave_search`
  - Inputs: `query`, optional `count`, `country`, `search_lang`, `freshness`, `safesearch`
  - Output: formatted search results + metadata
