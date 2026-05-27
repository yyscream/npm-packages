# pi-extension-wiki-tools

Pi extension + skill for creating local wiki/documentation extension packages from the repository wiki templates.

## Registered skill

- `wiki-tools` — routes wiki package creation/update/validation work to the tools below.

## Registered commands

- `/wiki-templates` — lists available template directories.
- `/wiki-create <repo-url-or-topic> [--repo-url URL] [--target-dir DIR] [--dry-run] [--overwrite]` — creates a new local wiki package. If the first argument is a repository URL, names and the setup command are inferred from that URL.
- `/wiki-update <repo-url-or-topic> --target-dir DIR [--overwrite] [--apply]` — previews or applies a template refresh. Defaults to dry-run; `--apply` writes files.
- `/wiki-validate <target-dir>` — validates a generated wiki package.

Commands also accept a JSON object, for example:

```txt
/wiki-create https://github.com/example/example-wiki.git
/wiki-create {"repoUrl":"https://github.com/example/example-wiki.git"}
```

## Registered tools

- `list_wiki_templates` — lists available template directories from:
  - `WIKI_TEMPLATES_DIR`
  - `<cwd>/templates`
  - this package's bundled `templates/`
  - the monorepo sibling `../templates`
- `create_wiki` — creates a new `pi-extension-<topic>-wiki-local` package from `templates/local-wiki-extension`.
- `update_wiki` — previews or applies template refreshes for an existing wiki package. Defaults to dry-run.
- `validate_wiki` — checks required package files, Pi metadata, bundled skill files, and unreplaced placeholders.

## Example

```json
{
  "topicName": "Example",
  "repoUrl": "https://github.com/example/example-wiki.git",
  "docsPath": "$HOME/.examplewiki"
}
```

This creates:

```txt
pi-extension-example-wiki-local/
├── index.ts
├── package.json
├── LICENSE
├── README.md
└── skills/example-local/SKILL.md
```

Generated tool names use the `<extensionId>wiki_*` convention, for example `examplewiki_search` and `examplewiki_extract`. Each generated package includes a wiki-specific setup command, for example `/examplewiki-local-setup`, which clones or updates the configured repository into the local docs path.

## Safety

`create_wiki` refuses to write into an existing target unless `overwrite: true` is set. `update_wiki` defaults to `dryRun: true`; use the dry-run plan before overwriting customized package files.
