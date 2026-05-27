---
name: hyprland-local
description: Use automatically for Hyprland troubleshooting, configuration, Wayland compositor issues, monitors, input, keybinds, rules, animations, decoration, portals, plugins, crashes, NVIDIA, or hyprctl/hyprpm questions. Prefer local official Hyprland Wiki evidence via hyprwiki tools before web sources.
---

# Hyprland Local Wiki

Use the local official Hyprland Wiki clone before web sources. Optimize for source-backed answers with bounded output and local path citations.

## Corpus profile

- Local checkout path: `~/.hyprwiki`
- Upstream repository: `https://github.com/hyprwm/hyprland-wiki.git`
- Parser/format: Markdown with frontmatter-title handling and fenced-code-aware heading extraction
- Indexed extensions: `.md`, `.mdx`
- Setup command: `/hyprwiki-local-setup`
- Smoke test: `/hyprwiki-smoke-test` or `hyprwiki_smoke_test({ maxSearchResults: 5 })`

## Required workflow

1. Run `hyprwiki_search({ query, limit: 5, includeSnippets: false })` for the user's Hyprland topic.
2. Use `hyprwiki_sections({ page, maxSections: 40-80 })` when the right page is found but the relevant heading is unclear.
3. Prefer exact `hyprwiki_extract({ page, section, maxChars: 4000-8000, maxSections: 2-5 })` for final evidence.
4. Use query extraction only for exploration, then switch to exact section headings when available.
5. Use `hyprwiki_read({ page, maxChars })` only for broad context or when no relevant heading is identifiable.
6. Use `hyprwiki_related({ page, limit: 5-10 })` when the issue spans connected Hyprland topics.
7. Compare documentation guidance with local config/system evidence when relevant.
8. Cite local paths and section names in final answers.
9. Prefer read-only diagnostics and ask before destructive or user-facing changes.

## Search hints

- Monitors: `monitor resolution scale`, `hyprctl monitors`, `workspace monitor`.
- Window rules: `windowrule float opacity`, `window rules class title`, `workspace rules`.
- Input/keybinds: `keyboard kb_layout keybinds`, `bind dispatcher`, `touchpad gestures`.
- Portals/screen sharing: `xdg desktop portal screenshare`, `xdg-desktop-portal-hyprland`.
- NVIDIA: `nvidia wayland env`, `nvidia multi gpu`, `GBM`.
- Plugins: `hyprpm plugins`, `using plugins`, `plugin guidelines`.

## Source priority

1. Local official Hyprland Wiki via `hyprwiki_*` tools.
2. Local user config/system evidence (`hyprctl`, config files, logs) when relevant.
3. Official online Hyprland Wiki/GitHub only when local docs are missing, stale, or insufficient.
4. Other sources only when necessary and clearly labeled.

## Tool usage

- `hyprwiki_search({ query, limit, includeSnippets })`: find candidate pages. Keep `limit` at 5 unless exploring broadly; snippets default off.
- `hyprwiki_sections({ page, maxSections })`: inspect headings before extracting from large pages.
- `hyprwiki_extract({ page, section, maxChars, maxSections })`: retrieve focused exact sections; best for final answers.
- `hyprwiki_extract({ page, query, maxChars, maxSections })`: retrieve query-relevant sections; best for exploration.
- `hyprwiki_read({ page, maxChars })`: retrieve broad page text; use sparingly.
- `hyprwiki_related({ page, limit })`: discover linked local pages.
- `hyprwiki_smoke_test({ maxSearchResults })`: verify parser/search/extract/read behavior after package or corpus updates.

## Read-only diagnostics examples

Use only when relevant:

```bash
hyprctl version
hyprctl monitors
hyprctl clients
hyprctl activewindow
hyprctl getoption general:gaps_in
journalctl --user -b -u hyprland --no-pager
```

Ask before editing Hyprland config, restarting the compositor/session, disabling portals, changing GPU environment, or installing/removing plugins.

## Token/output discipline

- Prefer `search -> sections -> exact section extract` for final answers.
- Keep search limits small (`limit: 5-10`) and snippets off unless needed.
- Use `maxSections` around 2-5 and `maxChars` around 4000-8000 for focused extracts.
- If `omittedSectionCount` or `truncated: true` affects confidence, say so explicitly.

## Citation format

Use local source citations like:

```txt
Sources:
- ~/.hyprwiki/content/Configuring/Basics/Monitors.md — General
- ~/.hyprwiki/content/Configuring/Basics/Window-Rules.md — Window Rules
```
