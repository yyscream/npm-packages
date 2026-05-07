# @firstpick/pi-extension-upgrade-extensions

Update npm-installed Pi extensions from configured package entries.

## What it does

- Checks configured npm extensions for available updates.
- Supports interactive multi-select update flow.
- Supports direct update-all mode.
- Prompts for optional Pi reload after successful updates.

## Install

```bash
pi install npm:@firstpick/pi-extension-upgrade-extensions
```

## Configuration

No required configuration.

## Commands

- `/extensions-update` — checks for updates, then shows a multi-select list of outdated extensions.
- `/extensions-update all` — checks for updates and updates all outdated extensions directly.

## Shortcuts

(Within the interactive selector)

- `Space` — toggle current extension
- `a` — select all / clear all
- `Enter` — confirm selection and start updates
- `Esc` — cancel
- `↑/↓` or `j/k` — move selection cursor

## Tools

None.
