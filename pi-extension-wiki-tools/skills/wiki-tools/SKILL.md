---
name: wiki-tools
description: Use when creating, updating, validating, evaluating, or maintaining Pi local wiki/documentation extension packages from templates. Provides create_wiki, update_wiki, list_wiki_templates, and validate_wiki workflows, plus quality gates for accuracy, effectiveness, and token output.
---

# Wiki Tools

Use this skill to scaffold, tune, validate, and evaluate Pi local wiki extension packages.

Reference: [generalized wiki quality improvements](references/generalized-wiki-quality-improvements.md).

## Quality target

Aim for **90-95/100 confidence** before considering a generated wiki complete. Confidence must come from observed tool behavior against realistic prompts, not just successful file generation.

Score every generated wiki on:

- **Accuracy**: corpus path/file types/format are correct; titles/headings match source; top search results include canonical pages; extracts answer the prompt with valid local citations.
- **Effectiveness**: setup/status/missing-docs behavior is clear; prompt routing is specific; diagnostics and safety language fit the domain; workflow is repeatable.
- **Token output**: search/read/extract outputs are bounded; exact-section extracts are preferred for final answers; omitted/truncated output is visible.

If any category is below **90/100**, keep tuning or explicitly document why confidence remains lower.

## Required workflow

1. Inspect available templates with `list_wiki_templates` or `/wiki-templates` when the template name is unclear.
2. Profile the corpus before or immediately after creation:
   - canonical docs path
   - repo/source URL
   - source format: `markdown`, `asciidoc`, or `html`
   - indexed file extensions
   - include/partial/generated-page behavior
   - broad domain terms that may need downweighting
   - domain query expansions and aliases
3. Use `create_wiki` or `/wiki-create` for new local wiki packages. Prefer `/wiki-create` for interactive creation because it previews inferred values, confirms creation, validates, and can queue an agent tuning/review pass.
4. Tune generated package files before declaring success:
   - `index.ts`: `CONFIG.format`, `CONFIG.fileExtensions`, prompt detection, query expansions, parser assumptions, cache/schema behavior.
   - `skills/*/SKILL.md`: precise source priority, search/sections/extract workflow, diagnostics, safety warnings, token discipline.
   - `README.md` and `references/*`: corpus profile, limitations, evaluation summary.
5. Use `validate_wiki` or `/wiki-validate` after creation or manual edits.
6. Run practical package checks when feasible:
   ```bash
   npm install --package-lock-only --ignore-scripts
   npm pack --dry-run
   bun build index.ts --target=node --outfile=/tmp/<pkg>-index-check.js
   ```
7. Evaluate with at least five realistic simulations across difficulty levels:
   - novice setup question
   - beginner configuration question
   - intermediate troubleshooting/API question
   - advanced system/architecture question
   - expert edge case or developer workflow
8. For each simulation, record top search results, selected page, section list size, extract size, matched sections, omitted/truncated state, and accuracy/effectiveness/token-output scores.
9. Prefer this answer workflow for generated wiki skills:
   ```txt
   search -> sections -> exact section extract -> final answer with local citation
   ```
   Query extraction is useful for exploration but can over-select sections on large pages.
10. Use `update_wiki` or `/wiki-update` only when the user wants to refresh scaffolded files from the template. Avoid overwriting customized files unless explicitly requested or the dry-run shows safe changes.

## User commands

- `/wiki-templates`
- `/wiki-create <repo-url-or-topic> [--repo-url URL] [--target-dir DIR] [--doc-format markdown|asciidoc|html] [--dry-run] [--overwrite] [--yes] [--agent-review] [--no-agent-review]`
- `/wiki-update <repo-url-or-topic> --target-dir DIR [--overwrite] [--apply]`
- `/wiki-validate <target-dir>`

The create/update commands also accept a JSON object after the command. If the first argument is a repository URL, infer `repoUrl`, `topicName`, `extensionId`, package names, docs path, tool prefix, setup command, and any known corpus-specific tuning from the URL unless the user overrides them. Generic repository basenames like `documentation`, `docs`, `doc`, `wiki`, and `website` should not become the topic; use the repository owner or known project identity instead.

`/wiki-create` is intentionally interactive in UI mode. Use `--yes --no-agent-review` only for old non-interactive scaffold-only behavior.

## Naming defaults

For a new topic named `Example`:

- package directory: `pi-extension-example-wiki-local`
- package name: `@firstpick/pi-extension-example-wiki-local`
- extension id: `example`
- skill name: `example-local`
- setup command: `/example-wiki-local-setup`
- tool prefix: `example_wiki_*`
- parser format: `markdown` by default; use `asciidoc` for `.adoc` corpora and `html` for rendered/static HTML corpora

## Evaluation report expectations

Save a concise report when tuning a generated wiki, typically under `references/` in the generated package. Include:

- corpus profile
- simulation table with scores
- output-size observations
- concrete failure modes
- changes applied
- remaining caveats
- final confidence level

For AsciiDoc corpora, explicitly verify that code comments and delimited blocks are not parsed as headings and that include-heavy parent pages produce useful output.
