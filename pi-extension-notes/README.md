# pi-extension-notes

Local note management (create/read/update/delete) for Pi, with optional rule-note prompt injection.

## Goal

Provide fast local note-taking with fuzzy retrieval, while optionally turning selected “rule” notes into persistent behavioral context.

## Why it works this way

- Stores notes locally as markdown + `index.json` metadata for transparent, file-based ownership.
- Uses fuzzy matching and argument completions to make retrieval/editing quick in real workflows.
- Keeps “rule in prompt” opt-in via env flag, so users control how much persistent guidance enters the system prompt.

## Install

```bash
pi install npm:@firstpick/pi-extension-notes
```

Local testing:

```bash
pi install /absolute/path/to/pi-extension-notes
```

## Configuration

- `PI_NOTES_DIR`
  - Optional custom storage directory.
  - Default: `~/.pi/agent/memory/notes`
- `PI_NOTES_INCLUDE_RULES_IN_PROMPT`
  - `1|true|yes|on`: inject rule notes into system prompt on agent start.
  - unset/other: rule notes stay stored but are not injected.

## Commands

- `/note <title> :: <content>` or `/note <content>` — creates/saves a note.
- `/note-list` — lists saved notes (newest first).
- `/note-read [slug|query]` — reads a note (fuzzy match; picker when supported).
- `/note-update <slug|title> :: <content>` — updates an existing note.
- `/note-delete <slug|title>` — deletes a note (with confirmation in UI).
- `/note-status` — shows notes directory and rule-injection status.

## Tools

None.

## Publish

```bash
bun publish --access public
```

```bash
npm publish --access public
```
