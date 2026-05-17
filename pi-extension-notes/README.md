# pi-extension-notes

Local notes management for Pi with optional rule-note prompt injection.

## What it does

- Create, list, read, update, and delete local markdown notes.
- Uses fuzzy lookup for fast retrieval/editing.
- Stores notes in a transparent file-based structure.
- Optionally injects `rule*` notes into the system prompt at startup.

## Install

```bash
pi install npm:@firstpick/pi-extension-notes
```

## Configuration

- `PI_NOTES_DIR`
  - Optional custom notes storage directory.
  - Default: `~/.pi/agent/memory/notes`
- `PI_NOTES_INCLUDE_RULES_IN_PROMPT`
  - `1|true|yes|on`: inject rule notes into system prompt on start.
  - unset/other: keep rule notes stored but do not inject.

## Commands

- `/note <title> :: <content>` or `/note <content>` — create/save a note.
- `/note-list` — list notes (newest first).
- `/note-read [slug|query]` — read a note (fuzzy match).
- `/note-update <slug|title> :: <content>` — update a note.
- `/note-delete <slug|title>` — delete a note (with confirmation in UI).
- `/note-status` — show notes directory and rule-injection status.

## Tools

- `note_list` — list notes with optional rule filtering.
  - Inputs: `limit` (1–100), optional `includeRulesOnly`
- `note_read` — read one note by slug/title using fuzzy matching.
  - Input: `query`
- `note_update` — update an existing note's content by slug/title.
  - Inputs: `query`, `content`
- `note_delete` — delete a note by slug/title. Requires explicit `confirm=true`.

## Example view

```text
/note rule-testing :: Always run the smallest useful check before claiming completion.
Saved note: rule-testing

/note-list
- rule-testing  [rule]

/note-read testing
# rule-testing
Always run the smallest useful check before claiming completion.
```

Use notes for durable reminders, project conventions, or `rule*` notes you may want injected into future sessions.
