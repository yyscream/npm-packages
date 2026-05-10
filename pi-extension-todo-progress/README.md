# @firstpick/pi-extension-todo-progress

Auto todo/progress tracking for multi-goal prompts.

## What it does

- Instructs the agent to create concise, agent-authored todos for multi-step work.
- Tracks checklist markers from assistant messages instead of copying raw user prompt lines.
- Uses explicit status markers: `[ ]` not started, `[-]` partial, `[x]` done.
- Clears the widget automatically when all items are complete.
- Shows up to 5 rows.
- Supports hiding the current list manually.

## Install

```bash
pi install npm:@firstpick/pi-extension-todo-progress
```

## Configuration

No required configuration.

## Commands

None.

## Shortcuts

- `Ctrl+Alt+X` — hide current list.
- `Ctrl+Alt+J` / `Ctrl+Alt+K` — scroll todo list down/up.

## Tools

None.
