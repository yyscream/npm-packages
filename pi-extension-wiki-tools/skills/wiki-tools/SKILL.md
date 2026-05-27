---
name: wiki-tools
description: Use when creating, updating, validating, or maintaining Pi local wiki/documentation extension packages from templates. Provides create_wiki, update_wiki, list_wiki_templates, and validate_wiki tool workflows.
---

# Wiki Tools

Use this skill to scaffold and maintain Pi local wiki extension packages from the repository templates.

## Required workflow

1. Inspect available templates with `list_wiki_templates` or `/wiki-templates` when the template name is unclear.
2. Use `create_wiki` or `/wiki-create` for new local wiki packages.
3. Use `validate_wiki` or `/wiki-validate` after creation or manual edits.
4. Use `update_wiki` or `/wiki-update` only when the user wants to refresh scaffolded files from the template.
5. Avoid overwriting customized files unless the user explicitly requests `overwrite: true`, `--overwrite`, or the dry-run shows the exact affected files.

## User commands

- `/wiki-templates`
- `/wiki-create <repo-url-or-topic> [--repo-url URL] [--target-dir DIR] [--dry-run] [--overwrite]`
- `/wiki-update <repo-url-or-topic> --target-dir DIR [--overwrite] [--apply]`
- `/wiki-validate <target-dir>`

The create/update commands also accept a JSON object after the command. If the first argument is a repository URL, infer `repoUrl`, `topicName`, `extensionId`, package names, docs path, tool prefix, and setup command from the URL unless the user overrides them.

## Naming defaults

For a new topic named `Example`:

- package directory: `pi-extension-example-wiki-local`
- package name: `@firstpick/pi-extension-example-wiki-local`
- extension id: `example`
- skill name: `example-local`
- setup command: `/examplewiki-local-setup` (generated in `index.ts`; clones/updates the configured repo into `docsPath`)
- tool prefix: `examplewiki_*`

## Validation expectations

After tool calls, run normal repo checks when practical:

```bash
npm install --package-lock-only --ignore-scripts
npm pack --dry-run
```

For generated wiki packages, also verify no unreplaced template placeholders remain.
