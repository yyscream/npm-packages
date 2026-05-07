# @firstpick/pi-extension-plan-mode-toggle

Plan mode workflow extension for Pi.

## What it does

- Toggle plan mode with `Ctrl+Q` or `/plan-mode on|off|status`.
- Optionally select a dedicated planning model with `/plan-model`.
- Runs a mandatory planning questionnaire before transforming prompts.
- Forces structured `PLAN.md` planning output and checks for web evidence links.
- Archives `PLAN.md` snapshots to `~/.pi/agent/docs/<topic>/PLAN.md`.

## Install

```bash
pi install npm:@firstpick/pi-extension-plan-mode-toggle
```

## Configuration

No required configuration beyond runtime requirements.

## Requirements

- `brave_search` tool must be available in Pi.
- `BRAVE_SEARCH_API_KEY` must be set in Pi environment.

## Commands

- `/plan-mode on|off|status`
- `/plan-model [select|provider/model-id]`

## Shortcuts

- `Ctrl+Q` — toggle/arm plan mode.

## Tools

None.
