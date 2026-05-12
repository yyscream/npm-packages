# @firstpick/pi-extension-plan-executor

Autonomous `PLAN.md` checklist executor for Pi.

## What it does

- Reads markdown checklist items (`- [ ]` / `- [x]`).
- Keeps steering execution until unchecked items are completed.
- Tracks active execution state and progress.

## Install

```bash
pi install npm:@firstpick/pi-extension-plan-executor
```

## Configuration

No required configuration.

## Commands

- `/execute-plan [path]` — start execution loop (default: `PLAN.md`).
- `/stop-plan` — stop active loop.
- `/plan-status` — show current progress.

## Tools

None.

## Example view

```text
/execute-plan PLAN.md
PLAN executor started
Progress: 0/3 complete

- [x] Inspect current implementation
- [-] Apply the next planned change
- [ ] Run verification checks
```

Use this when you already have a checklist and want Pi to keep steering work until every item is finished or you stop it.
