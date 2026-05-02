# pi-extension-brave-search

Brave Search tool for Pi with API key resolution from env and .env files.

## Install

```bash
pi install npm:@firstpick/pi-extension-brave-search
```

For local testing:

```bash
pi install /absolute/path/to/pi-extension-brave-search
```

## Configuration

- `BRAVE_SEARCH_API_KEY`

## Commands

- `/brave-search-status`
- `/brave-search-test <query>`

## Tools

- `brave_search`

## Publish

Preferred (Bun):

```bash
bun publish --access public
```

Alternative (npm):

```bash
npm publish --access public
```
