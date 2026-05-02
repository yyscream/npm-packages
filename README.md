# firstpick npm/bun packages

This repository contains my public JavaScript/TypeScript packages published via npm (using Bun and/or npm).

Right now it contains **Pi extension packages**.

## Packages

### `@firstpick/pi-extension-bang-command-autocomplete`
Adds autocomplete for `!<command>` in Pi.

- Fast suggestions from a built-in command list
- Optional shell-history command indexing via env flag

### `@firstpick/pi-extension-brave-search`
Adds a `brave_search` tool to Pi for up-to-date web search.

- Uses Brave Search API
- Supports query options like country/language/freshness/safesearch
- Includes status/test helper commands

### `@firstpick/pi-extension-fish-user-bash`
Runs Pi `!` / `!!` commands through fish shell.

- Fish as default shell backend
- Configurable shell path via env var

### `@firstpick/pi-extension-memory-helper`
Adds lightweight memory commands and a memory tool.

- `/remember` to append notes
- `/memory-search` to search memory files
- `remember_note` tool for agent use

### `@firstpick/pi-extension-notes`
Adds local notes management inside Pi.

- Create, list, read, update, delete notes
- Fuzzy note lookup and quick status command
- Optional rule-note injection into prompt

## Utility scripts

- `check-publish-readiness.sh` – validates package metadata, extension entries, dry-run publish, and registry/version status
- `publish-packages.sh` – plans/applies publish actions dynamically for all package folders

## Publish model

- Registry: **npm**
- Client: **bun** (preferred) or **npm**
- Installation for users remains standard npm registry usage, e.g.:

```bash
pi install npm:@firstpick/pi-extension-notes
```
