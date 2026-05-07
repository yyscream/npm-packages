# @firstpick/pi-extension-plan-executor

Autonomous `PLAN.md` executor for Pi.

## Commands

- `/execute-plan [path]` — starts execution loop (default: `PLAN.md`)
- `/stop-plan` — stops active loop
- `/plan-status` — shows current progress

## Behavior

The extension checks markdown checklist items (`- [ ]` / `- [x]`) and keeps steering Pi until all unchecked items are completed.

## Install in Pi

Symlink `index.ts` into `~/.pi/agent/extensions/` and run `/reload`.
