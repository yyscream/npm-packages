# @firstpick/pi-extension-release-npm

Release orchestration command for this npm-packages workspace.

## What it does

- Adds `/release-npm` command.
- Runs release preflight checks before asking to publish.
- Shows a summary of planned version changes and publish actions in the confirmation prompt.
- Publishes only after explicit confirmation.
- Streams live release output in an above-editor panel, separate from the conversation transcript.
- Keeps the normal Pi input row usable while the release is running.
- Shows phase/status/help in a below-editor footer instead of at the top of the output.
- Toggles compact/expanded output with `/release-toggle` while `/release-npm` runs in the background.
- Aborts the active release subprocess with `/release-abort` while `/release-npm` runs in the background.

## Install

```bash
pi install npm:@firstpick/pi-extension-release-npm
```

## Configuration

No required configuration.

## Commands

- `/release-npm` — runs `./release-workflow.sh --plan --all`, shows the planned version/publish summary, prompts for confirmation, then runs `./release-workflow.sh --publish --all` if confirmed.
- `/release-toggle` — toggles active release output between compact and expanded mode.
- `/release-abort` — aborts the active release subprocess.

## Tools

None.

## Example view

```text
/release-npm
Release preflight summary:
Version changes:
  @firstpick/pi-extension-release-npm from 0.2.0: would bump up -> 0.2.1
Bump summary:
  - would bump up: 1
  - would reduce down: 0
  - unchanged: 13
  - first release (no npm version): 0
  - errors: 0
Will publish:
  @firstpick/pi-extension-release-npm@0.2.1 -> publish-update
Will skip:
  none
Blocked:
  none

Publish eligible packages now?  No / Yes

Release workflow
  Applying required version bumps: ./bump-package-versions.sh --target all --apply
  Running: ./publish-packages.sh --target all --publisher npm --access public --apply --strict-auth

Publish summary:
  - published total: 3
  - skipped: 11
  - failed: 0
```

The command checks first, asks only after showing the preflight summary, and keeps release output visible in Pi.
