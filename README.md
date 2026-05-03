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

### `@firstpick/pi-extension-git-footer-status`
Enhanced footer/status line for Pi sessions.

- Git status snapshot (branch, dirty state, sync, operations)
- Token/cost/context usage telemetry in footer
- `/git-footer-refresh` command

### `@firstpick/pi-extension-reverse-last`
Undo support for Pi `write`/`edit` file mutations.

- Per-session undo stack
- `/reverse-last [count]` command
- Optional state directory override via env var

### `@firstpick/pi-extension-safety-guard`
Protective confirmation layer for risky operations.

- Confirmation prompts for dangerous bash commands
- Protected-path checks for `write`/`edit`
- Auto-block behavior in non-interactive mode

### `@firstpick/pi-extension-stats`
Usage analytics command for Pi session history.

- Daily token graph (`/stats`, `/stats N`, `/stats all`)
- Input/output/cache breakdown
- Top model usage summary

## Utility scripts

- `check-publish-readiness.sh` – validates package metadata, extension entries, dry-run publish, and registry/version status
- `publish-packages.sh` – plans/applies publish actions dynamically for all package folders
- `sync-dotfiles-extension-symlinks.sh` – ensures `~/.dotfiles/.pi/agent/extensions/*.ts` are symlinks to canonical `pi-extension-*/index.ts` files; renames non-symlink files to `.hardcoded.<timestamp>.bak`

## Publish model

- Registry: **npm**
- Client: **bun** (preferred) or **npm**
- Installation for users remains standard npm registry usage, e.g.:

```bash
pi install npm:@firstpick/pi-extension-notes
```
