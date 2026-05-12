# pi-extension-reverse-last

Session-local undo for Pi `write` and `edit` file changes.

## What it does

- Captures pre-change file snapshots for successful `write`/`edit` tool calls.
- Maintains a per-session undo stack.
- Restores one or multiple recent changes with a command.

## Install

```bash
pi install npm:@firstpick/pi-extension-reverse-last
```

## Configuration

- `PI_REVERSE_LAST_STATE_DIR` (optional)
  - Override undo state storage directory.
  - Accepts absolute paths or home-relative paths.
  - Default: `~/.pi/agent/state/reverse-last`

## Commands

- `/reverse-last [count]` — undo last successful file changes in current session.

## Tools

None.

## Example view

```text
/reverse-last
Restored 1 file from the session undo stack:
- src/config.ts

/reverse-last 2
Restored 2 recent file changes.
```

This is a quick escape hatch for recent Pi `write`/`edit` changes in the current session.
