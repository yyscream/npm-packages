# pi-extension-fish-user-bash

Use fish (or a chosen shell) for Pi `!` / `!!` command execution.

## Goal

Align Pi shell execution with your real interactive shell environment, especially for users who work in fish.

## Why it works this way

- Prioritizes explicit configuration (`PI_USER_BASH_SHELL_PATH`) for deterministic behavior.
- Auto-detects fish when not configured, so most fish users get the right shell with zero setup.
- Falls back to `/bin/bash` as a safe baseline if fish is unavailable.

## Install

```bash
pi install npm:@firstpick/pi-extension-fish-user-bash
```

Local testing:

```bash
pi install /absolute/path/to/pi-extension-fish-user-bash
```

## Configuration

- `PI_USER_BASH_SHELL_PATH`
  - absolute path (example: `/usr/bin/fish`), or
  - binary name on `PATH` (example: `fish`)
  - if unset: tries fish automatically, then `/bin/bash`

## Commands

- `/user-bash-shell` — prints the resolved shell binary used for `!` and `!!`.

## Tools

None.

## Publish

```bash
bun publish --access public
```

```bash
npm publish --access public
```
