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
