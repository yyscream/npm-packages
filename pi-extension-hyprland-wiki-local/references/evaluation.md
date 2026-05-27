# Hyprland Wiki Local Evaluation

Date: 2026-05-27  
Package: `@firstpick/pi-extension-hyprland-wiki-local`  
Skill: `hyprland-local`  
Confidence after migration pass: **91/100**

## Corpus profile

- Local checkout: `/home/firstpick/.hyprwiki`
- Upstream remote: `https://github.com/hyprwm/hyprland-wiki.git`
- Local revision observed: `365ced5`
- Parser/format: Markdown through shared `pi-utils` local-wiki engine
- Indexed extensions: `.md`, `.mdx`
- Indexed page count observed: `101`

## Migration changes applied

- Bumped cache schema to rebuild with improved Markdown parser behavior.
- Added frontmatter-title handling and fenced-code-aware heading extraction in shared `pi-utils`.
- Added corpus-specific stopwords/downweights for broad Hyprland/wiki/config terms.
- Added `windowrule` query expansion.
- Added compact search default; snippets are returned only with `includeSnippets: true`.
- Added `maxSections` support and omitted/truncated output metadata.
- Added `/hyprwiki-smoke-test` and `hyprwiki_smoke_test`.
- Rewrote `hyprland-local` skill with source priority, search hints, diagnostics, safety, and token discipline.

## Simulation summary

| Scenario | Query | Observed canonical result | Accuracy | Output discipline |
|---|---|---|---:|---:|
| Monitors | `monitor resolution scale` | `Monitors.md` #1 | 95 | 88 |
| Window rules | `windowrule float opacity` | `Window-Rules.md` #1; title fixed | 96 | 88 |
| Portal/screenshare | `xdg desktop portal screenshare` | `xdg-desktop-portal-hyprland.md` #1 | 96 | 94 |
| Plugins | `hyprpm plugins` | `Using-Plugins.md` #1 | 95 | 94 |
| NVIDIA | `nvidia wayland hyprland env` | `Nvidia/_index.md` #1, env page #2 | 91 | 92 |

## Remaining caveats

- The upstream wiki moved to newer Hyprland Lua/hyprlang content, so older user configs may need version-specific online docs.
- Search remains lexical, not semantic. Similar pages such as Variables/Dispatchers/FAQ can appear in broad config queries.
- Related-link output comes from lightweight Markdown link parsing and is not a full Hugo site graph.
- `validate_wiki` still flags the setup-command heuristic for this older custom package even though `/hyprwiki-local-setup` exists and is registered.

## Scores

- Accuracy: **92/100**
- Effectiveness: **90/100**
- Token/output discipline: **91/100**
- Final confidence: **91/100**
