# Local Wiki Extension Scaffold Checklist

Audit status for `@firstpick/pi-extension-raspberrypi-wiki-local` after the agent tuning pass.

## Corpus

- [x] Pick one canonical local docs path: `~/.raspberrypiwiki`.
- [x] Decide setup behavior: clone/update `https://github.com/raspberrypi/documentation` idempotently with `git clone --depth=1` or `git pull --ff-only`.
- [x] Set `CONFIG.format` to `asciidoc`.
- [x] Set `CONFIG.fileExtensions` to match the documentation source: `.adoc`, `.asciidoc`, `.asc`.
- [x] Verify parser output for titles/headings; include-heavy parents now title from the source file/fallback path, while sections use expanded includes.
- [x] Add Raspberry-Pi-specific `CONFIG.queryExpansions`.

## Agent routing

- [x] Choose extension id `raspberrypi`; tool names are `raspberrypi_wiki_*`.
- [x] Choose skill name `raspberrypi-local`.
- [x] Write a Raspberry-Pi-specific skill `description` for auto-loading.
- [x] Set `CONFIG.promptDetection` conservatively for Raspberry Pi OS, hardware, camera, boot/config, Compute Module, and Pico terms.
- [x] Add Raspberry-Pi-specific read-only diagnostics to `SKILL.md`.

## Safety and citations

- [x] Retrieval tools are read-only.
- [x] Setup command is idempotent and reports clone/update/manual-path state.
- [x] Missing local docs fail loudly instead of silently falling back.
- [x] Final answers cite local paths as `<path> — <section>`.
- [x] Safety language covers boot/config edits, EEPROM/firmware, imaging/partitioning, package changes, remote-access exposure, and GPIO/power wiring.

## Validation

- [x] Run status behavior through the registered tool harness.
- [x] Verify upstream repo shape and current revision against `origin/master`.
- [x] Test search/read/sections/extract/related/smoke-test against known pages.
- [x] Evaluate accuracy: top search results, titles, sections, extraction citations, and source fidelity.
- [x] Evaluate effectiveness: setup/status behavior, missing-docs handling, prompt detection, diagnostics, and safety guidance.
- [x] Evaluate token output: compact search, extract/read bounds, omitted section counts, and truncation metadata.
- [x] Run `validate_wiki`, `npm install --package-lock-only --ignore-scripts`, `npm pack --dry-run`, and `bun build` practical checks.

See `references/evaluation.md` for detailed findings, scores, caveats, and confidence.
