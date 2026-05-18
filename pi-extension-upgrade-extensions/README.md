# @firstpick/pi-extension-upgrade-extensions

Update npm-installed Pi extensions from configured package entries.

## What it does

- Checks configured npm extensions for available updates.
- Supports interactive multi-select update flow.
- Supports direct update-all mode.
- Prompts for optional Pi reload after successful updates.

## Install

```bash
pi install npm:@firstpick/pi-extension-upgrade-extensions
```

## Configuration

No required configuration inside the extension, but it only updates packages that Pi already knows about.

Expected Pi setup:

```json
{
  "packages": [
    "npm:@firstpick/pi-extension-stats",
    "npm:@firstpick/pi-extension-brave-search"
  ]
}
```

The extension reads `packages` from Pi's agent settings file, normally:

```text
~/.pi/agent/settings.json
```

Only entries starting with `npm:` are considered. Local file paths, symlinked development packages, and non-npm package entries are ignored. Each npm entry is queried with `npm view <package> version --json`, then updated by running:

```bash
pi install npm:<package>@latest
```

So the user needs:

- `npm` available on `PATH`
- network access to the npm registry
- package entries present in Pi settings
- permission for `pi install` to update the selected packages

## Commands

- `/extensions-update` — checks for updates, then shows a multi-select list of outdated extensions.
- `/extensions-update all` — checks for updates and updates all outdated extensions directly.

## Shortcuts

(Within the interactive selector)

- `Space` — toggle current extension
- `a` — select all / clear all
- `Enter` — confirm selection and start updates
- `Esc` — cancel
- `↑/↓` or `j/k` — move selection cursor

## Tools

None.

## Example view

```text
/extensions-update
Outdated Pi extensions
  [ ] @firstpick/pi-extension-stats            0.1.2 → 0.1.3
  [x] @firstpick/pi-extension-brave-search    0.1.5 → 0.1.6

Enter: update selected   Space: toggle   a: all   Esc: cancel
```

Use `all` for a fast update pass, or the selector when you want to choose exactly which extensions change.
