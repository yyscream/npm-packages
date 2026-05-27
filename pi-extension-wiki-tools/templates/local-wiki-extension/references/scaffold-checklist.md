# Local Wiki Extension Scaffold Checklist

Use this when turning the template into a real documentation wiki package.

## Corpus

- [ ] Pick one canonical local docs path.
- [ ] Decide whether setup clones a Git repo, installs an OS package, or only validates preexisting files.
- [ ] Set `CONFIG.format` to `markdown`, `asciidoc`, or `html`.
- [ ] Set `CONFIG.fileExtensions` to match the corpus.
- [ ] Verify parser output for titles/headings; AsciiDoc corpora should not be parsed as Markdown.
- [ ] Verify code comments and delimited code/listing blocks are not parsed as headings.
- [ ] Add topic-specific `CONFIG.queryExpansions`.
- [ ] Add corpus-specific `CONFIG.searchStopwords` and `CONFIG.termWeights` for broad terms.

## Agent routing

- [ ] Choose a short lowercase `extensionId`; tool names become `<extensionId>_wiki_search`, etc.
- [ ] Choose a skill name with Pi-valid skill naming rules.
- [ ] Write a specific skill `description`; this controls auto-loading.
- [ ] Set `CONFIG.promptDetection` conservatively to avoid false positives.
- [ ] Add domain-specific read-only diagnostics to `SKILL.md`.

## Safety and citations

- [ ] Retrieval tools are read-only.
- [ ] Setup command is idempotent or warns before mutation.
- [ ] Missing local docs fail loudly instead of silently falling back.
- [ ] Final answers cite local paths as `<path> — <section>`.

## Validation

- [ ] Run the status command.
- [ ] Run setup in a clean environment or verify the manual setup instructions.
- [ ] Test search/read/sections/extract/related/smoke-test against known pages.
- [ ] Verify relative links, anchors, includes, and generated-page structures where the corpus uses them.
- [ ] Evaluate accuracy: top search results, titles, sections, extraction citations, smoke-test output, and source fidelity.
- [ ] Evaluate effectiveness: setup/status behavior, missing-docs handling, prompt detection, diagnostics, and safety guidance.
- [ ] Evaluate token output: compact search/extract/read byte sizes, truncation, omitted section counts, and `maxChars`/`maxSections` overrides.
- [ ] Run at least five realistic prompt simulations and record scores/caveats in `references/evaluation.md` or a dated report.
- [ ] Trigger the skill from a realistic user prompt and verify local-docs-first routing.
