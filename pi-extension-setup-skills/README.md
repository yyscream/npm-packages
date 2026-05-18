# pi-extension-setup-skills

Adds `/setup-skills`, an interactive Pi UI for enabling/disabling skills.

## Usage

```text
/setup-skills
```

Controls:

- `↑` / `↓`: navigate
- `Enter` / `Space`: toggle selected skill
- Type: search/filter
- `Esc` or `q`: cancel
- `Ctrl+S`: save

The command updates Pi settings and prompts for `/reload` after changes.

## What it manages

The extension discovers skills from Pi's standard local locations and configured Pi packages:

- `~/.pi/agent/skills`
- `~/.agents/skills`
- project `.pi/skills`
- project `.agents/skills`
- skills exposed by entries in `settings.json` `packages`

For local skill selection it writes explicit `skills` filters. For package-bundled skills it preserves the package entry and updates its `skills` filter.
