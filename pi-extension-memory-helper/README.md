# pi-extension-memory-helper

Simple memory capture and lookup utilities for Pi.

## Goal

Make it easy to persist short notes and quickly retrieve relevant memory entries across daily markdown files.

## Why it works this way

- Uses plain markdown files in the agent memory directory (human-readable, git-friendly).
- Keeps write format lightweight and append-only for low risk of data loss.
- Adds both user commands and a tool (`remember_note`) so humans and agents can store notes consistently.

## Install

```bash
pi install npm:@firstpick/pi-extension-memory-helper
```

Local testing:

```bash
pi install /absolute/path/to/pi-extension-memory-helper
```

## Configuration

- `PI_MEMORY_HELPER_TIMEZONE`
  - Controls which day file is used for `/remember` and `remember_note`.
  - Default: `UTC`.

## Commands

- `/remember <note>` — appends a timestamped note to today’s memory file.
- `/memory-search <query>` — searches memory markdown files and returns top matches.
- `/memory-helper-status` — shows active timezone and memory directory.

## Tool

- `remember_note`
  - Input: `note`
  - Action: appends to today’s memory file
  - Output: saved file path + timezone info

## Publish

```bash
bun publish --access public
```

```bash
npm publish --access public
```
