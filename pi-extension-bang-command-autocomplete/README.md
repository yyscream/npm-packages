# pi-extension-bang-command-autocomplete

Autocomplete for `!<command>` in Pi.

## Goal

Make shell-style `!` execution faster and less error-prone by suggesting command names while typing.

## Why it works this way

- Ships with a curated common-command list, so suggestions work immediately.
- Can optionally include your shell history for personalized suggestions.
- Keeps scope intentionally small: command-name completion only (no argument prediction), which makes behavior predictable and lightweight.

## Install

```bash
pi install npm:@firstpick/pi-extension-bang-command-autocomplete
```

Local testing:

```bash
pi install /absolute/path/to/pi-extension-bang-command-autocomplete
```

## Configuration

- `PI_BANG_AUTOCOMPLETE_INCLUDE_HISTORY`
  - `1|true|yes|on`: include commands from `~/.bash_history` and fish history.
  - unset/other: use built-in common commands only (default).

## Commands

- `/bang-refresh` — rebuilds the autocomplete index (use after changing history/config).
- `/bang-status` — shows how many commands are indexed and whether history is enabled.

## Tools

None.

## Publish

```bash
bun publish --access public
```

```bash
npm publish --access public
```
