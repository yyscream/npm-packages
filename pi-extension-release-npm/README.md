# @firstpick/pi-extension-release-npm

Release orchestration command for this npm-packages workspace.

## What it does

- Adds `/release-npm` command.
- Runs release validation and pre-publish workflow.
- Optionally triggers publish when confirmed.

## Install

```bash
pi install npm:@firstpick/pi-extension-release-npm
```

## Configuration

No required configuration.

## Commands

- `/release-npm` — runs:
  1. `./check-publish-readiness.sh`
  2. `./release-workflow.sh` (without publish)
  3. publish confirmation prompt
  4. publish step if confirmed

## Tools

None.
