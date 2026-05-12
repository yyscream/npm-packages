# @firstpick/pi-extension-release-npm

Release orchestration command for this npm-packages workspace.

## What it does

- Adds `/release-npm` command.
- Asks before starting any publish-capable release workflow.
- Runs the release workflow once, so each validation/check step executes once per release attempt.
- Streams live release output in a widget.
- Toggles truncated/expanded live output with `Ctrl+O`.
- Aborts the active release subprocess with `Ctrl+C`.

## Install

```bash
pi install npm:@firstpick/pi-extension-release-npm
```

## Configuration

No required configuration.

## Commands

- `/release-npm` — prompts for confirmation, then runs `./release-workflow.sh --publish --all` once if confirmed.

## Tools

None.

## Example view

```text
/release-npm
Run release workflow and publish eligible packages?  No / Yes

Release workflow
  Applying required version bumps: ./bump-package-versions.sh --target all --apply
  Running: ./publish-packages.sh --target all --publisher npm --access public --apply --strict-auth

Publish summary:
  - published total: 3
  - skipped: 11
  - failed: 0
```

The command asks before starting, keeps release output visible in Pi, and avoids running the same release checks in both a preflight phase and a publish phase.
