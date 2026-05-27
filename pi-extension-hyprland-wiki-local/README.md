# hyprland-wiki-local Pi extension

Local Hyprland Wiki retrieval tools backed by the official GitHub wiki repository:

```txt
https://github.com/hyprwm/hyprland-wiki.git
```

Repository path:

```txt
~/.hyprwiki
```

Cache path:

```txt
~/.cache/pi/hyprland-wiki-local/
├── pages.json
└── metadata.json
```

## Setup

Run the Pi command:

```txt
/hyprwiki-local-setup
```

The setup command does not install OS packages. It creates/clones the wiki repository at `~/.hyprwiki` using:

```bash
git clone https://github.com/hyprwm/hyprland-wiki.git ~/.hyprwiki
```

If `~/.hyprwiki` is already a Git checkout, setup runs `git pull --ff-only` to refresh it.

## Registered commands

- `/hyprwiki-status` — reports repository path, Git remote/revision, page count, and cache freshness.
- `/hyprwiki-local-setup` — clones or fast-forward updates `~/.hyprwiki`.
- `/hyprwiki-smoke-test` — runs compact parser/search/extract/read checks against representative Hyprland topics.

## Registered tools

- `hyprwiki_search` — searches local Hyprland Wiki Markdown pages with query expansions, stopword/downweight tuning, compact output by default, and optional snippets.
- `hyprwiki_read` — reads a page as clean Markdown text with local path citation.
- `hyprwiki_sections` — lists extracted headings with `maxSections` and omitted-count metadata.
- `hyprwiki_extract` — extracts a named or query-relevant section with `maxSections`, truncation, and omitted-count metadata.
- `hyprwiki_related` — returns local Hyprland Wiki pages linked from a page.
- `hyprwiki_smoke_test` — runs parser/search/extract/read smoke checks.

## Notes

The first tool call builds the cache through the shared `pi-utils` local-wiki engine. Cache invalidation uses schema version, docs path, page count, and newest source mtime. Markdown parsing uses frontmatter titles and ignores headings inside fenced code blocks.

If `~/.hyprwiki` is missing or empty, tools warn that `/hyprwiki-local-setup` is required and stop instead of falling back silently.
