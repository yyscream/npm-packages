# pi-extension-brave-search

Brave Search integration for Pi.

## Goal

Provide a reliable web-search tool for up-to-date facts, docs, and references directly from Pi.

## Why it works this way

- Resolves API key in practical order (`env` -> local `.env` -> agent `.env`) to reduce setup friction.
- Exposes a real tool (`brave_search`) so the agent can use it during normal task execution.
- Applies result/size limits for stable output and safer context usage.

## Install

```bash
pi install npm:@firstpick/pi-extension-brave-search
```

Local testing:

```bash
pi install /absolute/path/to/pi-extension-brave-search
```

## Configuration

- `BRAVE_SEARCH_API_KEY` (required)

## Commands

- `/brave-search-status` — checks whether Brave Search is configured and where the key was found.
- `/brave-search-test <query>` — runs a direct test query and prints formatted results.

## Tool

- `brave_search`
  - Inputs: `query`, optional `count`, `country`, `search_lang`, `freshness`, `safesearch`
  - Output: formatted search results + structured metadata

## Publish

```bash
bun publish --access public
```

```bash
npm publish --access public
```
