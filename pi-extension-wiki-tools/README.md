# pi-extension-wiki-tools

Pi extension + skill for creating local wiki/documentation extension packages from the repository wiki templates.

## Registered skill

- `wiki-tools` — routes wiki package creation/update/validation work to the tools below.

## Registered commands

- `/wiki-templates` — lists available template directories.
- `/wiki-create <repo-url-or-topic> [--repo-url URL] [--target-dir DIR] [--doc-format markdown|asciidoc|html] [--dry-run] [--overwrite] [--yes] [--agent-review] [--no-agent-review]` — interactively creates a new local wiki package. In UI mode it prompts for missing input, previews inferred values, lets you choose dry-run/create, validates after writing, and by default queues an agent review/tuning pass. If the first argument is a repository URL, names and the setup command are inferred from that URL. Generic repo names like `documentation`, `docs`, and `wiki` use the repository owner as the topic.
- `/wiki-update <repo-url-or-topic> --target-dir DIR [--overwrite] [--apply]` — previews or applies a template refresh. Defaults to dry-run; `--apply` writes files.
- `/wiki-validate <target-dir>` — validates a generated wiki package.

Commands also accept a JSON object, for example:

```txt
/wiki-create https://github.com/example/example-wiki.git
/wiki-create https://github.com/example/example-wiki.git --yes --no-agent-review
/wiki-create {"repoUrl":"https://github.com/example/example-wiki.git"}
```

## Registered tools

- `list_wiki_templates` — lists available template directories from:
  - `WIKI_TEMPLATES_DIR`
  - `<cwd>/templates`
  - this package's bundled `templates/`
  - the monorepo sibling `../templates`
- `create_wiki` — creates a new `pi-extension-<topic>-wiki-local` package from `templates/local-wiki-extension`; use `docFormat` for non-Markdown corpora.
- `update_wiki` — previews or applies template refreshes for an existing wiki package. Defaults to dry-run.
- `validate_wiki` — checks required package files, Pi metadata, bundled skill files, and unreplaced placeholders.

## Example

```json
{
  "topicName": "Example",
  "repoUrl": "https://github.com/example/example-wiki.git",
  "docsPath": "~/.examplewiki"
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

Generated tool names use the `<extensionId>_wiki_*` convention, for example `example_wiki_search` and `example_wiki_extract`. Each generated package includes a wiki-specific setup command using `/<extensionId>-wiki-local-setup`, for example `/example-wiki-local-setup`, which shallow-clones or updates the configured repository into the local docs path. Parser formats currently supported by the template are `markdown`, `asciidoc`, and `html`.

## Safety

`create_wiki` and `/wiki-create` refuse to write into an existing target unless `overwrite: true` / `--overwrite` is set. `/wiki-create` is safe by default in interactive UI mode because it previews before writing. `update_wiki` defaults to `dryRun: true`; use the dry-run plan before overwriting customized package files.

## Evaluation expectations

Before considering a generated wiki package complete, test accuracy (relevant top search results, correct titles/headings, source-faithful extracts), effectiveness (setup/status, missing-docs failure, prompt routing, diagnostics), and token output (bounded search/extract/read defaults with truncation or omitted-section reporting).
