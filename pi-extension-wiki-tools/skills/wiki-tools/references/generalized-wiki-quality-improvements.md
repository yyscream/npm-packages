# Generalized Wiki Skill Quality Improvements

This note summarizes what should be generalized from the Raspberry Pi wiki evaluation into future Pi local wiki package creation.

## Goal

A generated wiki package should reach **90-95/100 confidence** for realistic domain prompts before it is considered complete. Confidence should be based on observed tool behavior, not just successful scaffolding.

## Generalizable lessons

### 1. Profile the corpus before tuning

Record these facts for every new wiki:

- canonical local docs path
- upstream repo/source URL and expected setup behavior
- source format: `markdown`, `asciidoc`, or `html`
- file extensions to index
- whether docs use includes/partials/generated pages
- whether source files or rendered output are more faithful
- known broad terms that should be downweighted in searches
- domain-specific synonyms and query expansions

Why: Raspberry Pi docs are AsciiDoc-heavy and include many partial files. A Markdown-biased parser produced inaccurate titles/headings until format-specific parsing was enabled.

### 2. Validate title and heading fidelity

Do not rely on package validation alone. Inspect 5-10 pages and verify:

- page title matches the human-visible document title
- section list matches source headings
- code comments and delimited blocks are not treated as headings
- include-only parent pages contain useful expanded text or are intentionally excluded
- local links resolve to useful related pages

### 3. Prefer exact-section extraction after search

Recommended answer workflow for most local wikis:

```txt
search -> sections -> exact section extract -> final answer with citation
```

Use query extraction for exploration, but switch to exact section extraction when headings are known. Query extraction can over-select sections when broad domain terms appear in many sections.

### 4. Build domain-specific search tuning

For each wiki, add:

- query expansions for common aliases and renamed tools
- broad-term downweights or stopwords where supported
- examples of good search queries in the skill
- page/section hints for high-frequency support scenarios

Raspberry Pi examples:

- `ssh` -> remote access, headless, raspi-config
- `camera` -> rpicam, libcamera, Picamera2, camera_auto_detect
- `config` -> config.txt, dtoverlay, dtparam
- `pico` -> RP2040, RP2350, Pico SDK, MicroPython

### 5. Bound token output by default

Defaults should optimize for useful evidence, not maximum recall:

- search: `limit: 5-10`, snippets only when useful
- sections: cap default headings and report `omittedSectionCount`
- extract: cap sections and chars, report omitted/truncated state
- read: reserve for broad context only

A good target is:

- search output under ~4 KB for routine `limit: 5`
- focused extract under ~6 KB for final-answer evidence
- explicit warning when omitted/truncated output affects confidence

### 6. Run multi-difficulty simulations

Before finalizing, create at least five realistic prompts:

1. novice setup question
2. beginner configuration question
3. intermediate troubleshooting/API question
4. advanced system/architecture question
5. expert edge case or developer workflow

For each simulation, record:

- search query and top 5 results
- selected page and why
- sections output size and omitted count
- extract output size, matched sections, omitted/truncated state
- accuracy, effectiveness, token-output scores
- changes needed if any score is below 90

### 7. Confidence gates

Use this gate before claiming 90-95 confidence:

- **Accuracy >= 90**: top results include the canonical page; extracted text directly answers the prompt; title/heading/citation are correct.
- **Effectiveness >= 90**: workflow is repeatable; setup/status/missing-docs behavior is clear; prompt routing is specific; safety diagnostics match the domain.
- **Token output >= 90**: outputs are concise, bounded, and sufficient; omitted/truncated metadata is visible.

If any category is below 90, continue tuning or document why confidence remains lower.

## Skill/tooling improvements to consider next

These are reusable improvements for future local wiki packages:

- Add `minTokenMatches` or `requireAllTerms` to query extraction.
- Add corpus-specific stopwords/downweights for broad terms.
- Add a compact search mode that returns title/path/score by default and snippets on request.
- Add a simulation/evaluation helper command that creates a standard Markdown report.
- Add link-resolution tests for relative links, anchors, includes, and generated-page structures.
- Add parser-specific smoke tests for Markdown, AsciiDoc, and HTML templates.

## Recommended generated-package artifacts

Each mature generated wiki package should include:

- `references/evaluation.md` — corpus profile and initial audit
- `references/simulation-evaluation-YYYY-MM-DD.md` — realistic prompt simulations
- tuned `skills/<skill>/SKILL.md` with precise workflow and known page/section hints
- README notes about corpus format, setup behavior, and limitations
