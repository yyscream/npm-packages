# pi-extension-notes

Local notes CRUD extension for Pi with optional rule-note prompt injection.

## Install

```bash
pi install npm:@firstpick/pi-extension-notes
```

For local testing:

```bash
pi install /absolute/path/to/pi-extension-notes
```

## Configuration

- `PI_NOTES_DIR`
- `PI_NOTES_INCLUDE_RULES_IN_PROMPT`

## Commands

- `/note`
- `/note-list`
- `/note-read`
- `/note-update`
- `/note-delete`
- `/note-status`

## Tools

- none

## Publish

Preferred (Bun):

```bash
bun publish --access public
```

Alternative (npm):

```bash
npm publish --access public
```
