# Local Wiki Extension Scaffold Checklist

Use this when turning the template into a real documentation wiki package.

## Corpus

- [ ] Pick one canonical local docs path.
- [ ] Decide whether setup clones a Git repo, installs an OS package, or only validates preexisting files.
- [ ] Set `CONFIG.format` to `markdown` or `html`.
- [ ] Set `CONFIG.fileExtensions` to match the corpus.
- [ ] Add topic-specific `CONFIG.queryExpansions`.

## Agent routing

- [ ] Choose a short lowercase `extensionId`; tool names become `<extensionId>wiki_search`, etc.
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
- [ ] Test search/read/sections/extract/related against known pages.
- [ ] Trigger the skill from a realistic user prompt and verify local-docs-first routing.
