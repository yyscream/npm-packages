# @firstpick/pi-extension-release-npm

Release orchestration command for this npm-packages workspace.

## What it does

- Adds `/release-npm` command.
- Adds `/release-npm-setup` command to configure the npm auth token via Pi native input.
- Runs release preflight checks before asking to publish.
- Shows a summary of planned version changes and publish actions in the confirmation prompt.
- Publishes only after explicit confirmation.
- During preflight, uses version planning to shortlist publish candidates and runs publish checks only for that shortlist.
- After confirmation, publishes only package targets detected in the pre-confirmation publish plan instead of scanning all packages again.
- After a successful publish, updates installed Pi extensions only for packages detected in that same pre-confirmation publish plan.
- Streams live release output in an above-editor panel, separate from the conversation transcript.
- Keeps the normal Pi input row usable while the release is running.
- Shows phase/status/help in a below-editor footer instead of at the top of the output.
- Toggles compact/expanded output with `/release-toggle` while `/release-npm` runs in the background.
- Aborts the active release subprocess with `/release-abort` while `/release-npm` runs in the background.
- Saves each release run log under `~/.pi/agent/release-npm-logs/`.
- Shows saved logs with `/release-npm-logs` in an above-editor widget display that works in both TUI and Web UI.

## Install

```bash
pi install npm:@firstpick/pi-extension-release-npm
```

## Configuration

Publishing requires valid npm credentials. Run `/release-npm-setup`, paste an npm access token, and the extension will run:

```bash
npm config set //registry.npmjs.org/:_authToken "<token>"
```

It then verifies the token with `npm whoami`.

## Expected workspace structure

This extension is intended for a package workspace, not a single arbitrary npm package. Run `/release-npm` from the workspace root.

For local development workspaces, release helper scripts live under `dev/scripts`:

```text
npm-packages/
  dev/
    scripts/
      release-workflow.sh
      bump-package-versions.sh
      check-publish-readiness.sh
      publish-packages.sh

  pi-extension-example/
    package.json
    README.md
    LICENSE
    index.ts

  pi-skill-example/
    package.json
    README.md
    LICENSE
    ...
```

Package discovery is shallow: only direct child directories of the current working directory that contain a `package.json` are considered. Nested packages and npm/yarn/pnpm workspace metadata are not scanned.

Each package should include:

```json
{
  "name": "@scope/package-name",
  "version": "0.1.0",
  "license": "MIT",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./index.ts"]
  },
  "files": [
    "index.ts",
    "README.md",
    "LICENSE"
  ]
}
```

Readiness checks require or verify:

- valid `package.json`
- `name`, `version`, and `license`
- `README.md`
- `pi.extensions` with entries pointing to existing files or matching globs
- `keywords` containing `pi-package` is recommended for discoverability
- `LICENSE` is recommended

`/release-npm` runs `./dev/scripts/release-workflow.sh --plan --all` first. The plan step writes publish candidates from version planning to a temporary target list, applies planned version bumps in a temporary workspace, and runs publish checks only for those candidate directories. After confirmation it publishes only the package directories detected in that plan with `./dev/scripts/release-workflow.sh --publish --target <dir>`.

## Commands

- `/release-npm-setup` — prompts for an npm token with Pi native input, saves it using `npm config set //registry.npmjs.org/:_authToken <token>`, then verifies with `npm whoami`.
- `/release-npm` — runs `./dev/scripts/release-workflow.sh --plan --all`, shows the planned version/publish summary plus exact package targets, prompts for confirmation, then runs `./dev/scripts/release-workflow.sh --publish --target <dir>` only for those detected targets. It does not install packages after publishing.
- `/release-toggle` — toggles active release output between compact and expanded mode.
- `/release-abort` — aborts the active release subprocess.
- `/release-npm-logs` — select a saved release run and display it above the editor; press `Esc`/`q` in TUI or run `/release-npm-logs close` to close it.

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
  Publish candidates from version planning:
    - pi-extension-release-npm
  Applying planned version bumps in temporary workspace for publish candidates: ./dev/scripts/bump-package-versions.sh --targets-file /tmp/.../publish-targets.txt --apply
  Running publish plan for preselected targets against version-bumped temp workspace: ./dev/scripts/publish-packages.sh --targets-file /tmp/.../publish-targets.txt --publisher npm --access public --strict-auth

Publish summary:
  - published total: 3
  - skipped: 11
  - failed: 0
```

The command checks first, asks only after showing the preflight summary, and keeps release output visible in Pi.
