# pi-extension-fish-user-bash

Use fish (or a custom shell) for Pi `!` and `!!` command execution.

## What it does

- Overrides Pi `user_bash` operations to use your preferred shell.
- Prefers explicit shell configuration via env var.
- Auto-detects fish if not configured.
- Falls back to `$SHELL` (if valid), then bash.
- Uses cross-platform shell resolution (PATH-aware; supports Windows `.exe` lookups).

## Install

```bash
pi install npm:@firstpick/pi-extension-fish-user-bash
```

## Configuration

- `PI_USER_BASH_SHELL_PATH`
  - absolute path (example: `/usr/bin/fish`), or
  - executable name resolvable on `PATH` (example: `fish` or `bash`)
  - if unset: tries fish automatically, then `$SHELL` (if valid), then bash

## Commands

- `/user-bash-shell` — print the currently resolved shell path.

## Tools

None.
