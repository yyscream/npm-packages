# pi-extension-memory-helper

Simple memory capture and lookup helpers for Pi.

## What it does

- Adds fast note capture to daily memory files.
- Adds quick text search across memory markdown files.
- Exposes the same write path to both users and the agent via command + tool.
- Uses plain markdown files (human-readable, git-friendly).

## Install

```bash
pi install npm:@firstpick/pi-extension-memory-helper
```

## Configuration

- `PI_MEMORY_HELPER_TIMEZONE`
  - Controls which day file is targeted by `/remember` and `remember_note`.
  - Default: `UTC`.

## Commands

- `/remember <note>` — append a timestamped note to today’s memory file.
- `/memory-search <query>` — search memory markdown files and return top matches.
- `/memory-helper-status` — show active timezone and memory directory.

## Tools

- `remember_note`
  - Input: `note`
  - Action: append to today’s memory file
  - Output: saved file path + timezone info
