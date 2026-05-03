# pi-extension-bang-command-autocomplete

Autocomplete for `!<command>` in Pi.

## What it does

- Suggests command names while typing `!<command>`.
- Uses a built-in common-command index out of the box.
- Learns commands you run via `!`/`!!` and persists them across Pi sessions.
- Optionally adds commands from shell history for personalized suggestions.
- Keeps scope intentionally narrow (command-name completion only, no argument prediction).

## Install

```bash
pi install npm:@firstpick/pi-extension-bang-command-autocomplete
```

## Configuration

- `PI_BANG_AUTOCOMPLETE_INCLUDE_HISTORY`
  - `1|true|yes|on`: include commands from `~/.bash_history` and fish history.
  - unset/other: use built-in command list only (default).
- `PI_BANG_AUTOCOMPLETE_RUNTIME_STORE_PATH`
  - optional absolute/relative file path for persisted learned commands.
  - default: `~/.pi/agent/state/bang-command-autocomplete-runtime.json`.

## Commands

- `/bang-refresh` — rebuild autocomplete index.
- `/bang-status` — show indexed command count, history-index status, and runtime-learned count.

## Tools

None.
