# firstpick npm/bun packages

This repository contains my public JavaScript/TypeScript packages published via npm (using Bun and/or npm).

Right now it contains **Pi extension packages**.

## Packages

### `@firstpick/pi-extension-archwiki-local`
Adds local ArchWiki retrieval tools to Pi using the installed `arch-wiki-docs` package.

- `/archwiki-status` cache/docs status command
- `archwiki_search`, `archwiki_read`, `archwiki_sections`, `archwiki_extract`, `archwiki_related` tools
- Prefers local ArchWiki evidence for Arch/Linux troubleshooting

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

### `@firstpick/pi-extension-plan-mode-toggle`
Plan mode workflow controls for Pi.

- `/plan-mode on|off|status`
- `/plan-model [select|provider/model-id]`
- `Ctrl+Q` shortcut for toggle/arm flow

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

### `@firstpick/pi-extension-plan-executor`
Autonomous `PLAN.md` checklist execution loop.

- `/execute-plan [path]`
- `/stop-plan`
- `/plan-status`

### `@firstpick/pi-extension-release-npm`
Release orchestration command for this monorepo.

- `/release-npm` runs release checks and optional publish flow

### `@firstpick/pi-extension-todo-progress`
Auto todo/progress tracking extension.

- auto-creates todos for multi-step prompts
- persistent progress widget until completion

### `@firstpick/pi-extension-upgrade-extensions`
Update npm-installed Pi extensions.

- `/extensions-update` with interactive multi-select
- `/extensions-update all` to directly update all available updates

### `@firstpick/pi-utils`
Shared helpers used by multiple Pi extensions.

- Agent-dir resolution (`PI_CODING_AGENT_DIR` aware)
- Environment boolean parsing
- Agent-relative path resolution

## Utility scripts

- `check-publish-readiness.sh` – validates package metadata, extension entries, dry-run publish, registry/version status, and local-vs-npm packed contents
- `publish-packages.sh` – plans/applies publish actions dynamically for all package folders
- `bump-package-versions.sh` – checks npm published versions first and enforces the next release version for changed packages (`+0.0.1`, rolling `*.9` to next minor `.0`; bumps up or reduces down only when needed)
- `release-workflow.sh` – orchestrates release checks: `--check` reports required bumps, `--plan` includes bump planning, and `--publish` applies required bumps before publishing
- `sync-pi-package-symlinks.sh` – ensures local development symlinks for Pi extensions (`~/.pi/agent/extensions/*.ts`) and packaged skills (`~/.pi/agent/skills/<skill-name>`) point to canonical resources in `npm-packages`; renames non-symlink conflicts to `.hardcoded.<timestamp>.bak`

## Publish model

- Registry: **npm**
- Client: **npm** by default; **bun** is the fallback publisher when available
- Installation for users remains standard npm registry usage, e.g.:

```bash
pi install npm:@firstpick/pi-extension-notes
```
