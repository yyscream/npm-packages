# {{displayName}} Local Wiki Extension

Pi extension package that provides local-first search and retrieval tools for {{displayName}}.

## What it registers

- Command: `/{{extensionId}}_wiki-status`
- Command: `{{setupCommand}}`
- Tools: `{{extensionId}}_wiki_search`, `{{extensionId}}_wiki_read`, `{{extensionId}}_wiki_sections`, `{{extensionId}}_wiki_extract`, `{{extensionId}}_wiki_related`
- Skill: `{{skillName}}`

## Corpus

Default local documentation path:

```txt
{{docsPath}}
```

Configured upstream repository:

```txt
{{repoUrl}}
```

If no repository is configured, populate the docs path manually before using the retrieval tools.

The indexer reads files matching:

```txt
{{fileExtensionsRegex}}
```

Parser format:

```txt
{{docFormat}}
```

## Setup

Run inside Pi:

```txt
{{setupCommand}}
```

The setup command reports progress while checking the docs path, cloning/updating the repository, and counting indexed files.

Then verify:

```txt
/{{extensionId}}_wiki-status
```

## Development checks

```bash
npm install --package-lock-only --ignore-scripts
npm pack --dry-run
bun build index.ts --target=node --outfile=/tmp/{{extensionId}}-wiki-local-index-check.js
```

## Notes

- Retrieval tools are read-only.
- Missing local docs fail loudly instead of silently falling back to web sources.
- Query extracts are section-limited by default and report omitted sections to keep token output bounded.
- Final answers should cite local documentation paths as `<path> — <section>`.
- Keep corpus-specific tuning in `index.ts` and `skills/{{skillName}}/SKILL.md`.

## Evaluation checklist

- Accuracy: test representative search queries and verify top results, titles, headings, and extracted sections against source files.
- Effectiveness: test setup/status, missing-docs behavior, prompt detection, and domain diagnostics.
- Token output: record approximate output sizes for search/extract/read; adjust `maxChars`, `maxSections`, query expansions, or result metadata if output is routinely too verbose.
