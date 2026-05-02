# pi-extension-fish-user-bash

Use fish shell backend for Pi user bash commands (! and !!).

## Install

```bash
pi install npm:@firstpick/pi-extension-fish-user-bash
```

For local testing:

```bash
pi install /absolute/path/to/pi-extension-fish-user-bash
```

## Configuration

- `PI_USER_BASH_SHELL_PATH`
  - Can be an absolute path (e.g. `/usr/bin/fish`) or a binary name on `PATH` (e.g. `fish`)
  - If unset, the extension auto-resolves fish and falls back to `/bin/bash`

## Commands

- `/user-bash-shell`

## Tools

- none

## Publish

Preferred (Bun):

```bash
bun publish --access public
```

Alternative (npm):

```bash
npm publish --access public
```
