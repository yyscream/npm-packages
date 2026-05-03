# pi-extension-bang-command-autocomplete

Autocomplete for `!<command>` in Pi.

## What it does

- Suggests command names while typing `!<command>`.
- Uses a built-in common-command index out of the box.
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

## Commands

- `/bang-refresh` — rebuild autocomplete index.
- `/bang-status` — show indexed command count and history-index status.

## Tools

None.
