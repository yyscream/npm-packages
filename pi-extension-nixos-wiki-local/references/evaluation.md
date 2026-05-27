# NixOS/Nix Local Evaluation

Date: 2026-05-27  
Package: `@firstpick/pi-extension-nixos-wiki-local`  
Skill: `nixos-local`  
Confidence after migration pass: **88/100**

## Corpus profile

- Local docs path: `/home/firstpick/.nixoswiki`
- Upstream sparse checkouts:
  - `NixOS/nixpkgs` @ `5705e031`
  - `NixOS/nix.dev` @ `23d1323`
  - `NixOS/nix` @ `6f7e134`
- Parser/format: Markdown/RST-like Markdown through shared `pi-utils` local-wiki engine
- Indexed extensions: `.md`, `.mdx`, `.rst`
- Indexed page count observed: `633`

## Migration changes applied

- Bumped cache schema to rebuild with improved Markdown parser behavior.
- Added frontmatter-title handling, fenced-code-aware heading extraction, and `{#anchor}` stripping in shared `pi-utils`.
- Added corpus-specific stopwords/downweights for broad Nix/NixOS/manual/package terms.
- Added query expansions for `environment.systemPackages`, `configuration.nix`, and declarative package management.
- Added compact search default; snippets are returned only with `includeSnippets: true`.
- Added `maxSections` support and omitted/truncated output metadata.
- Added `/nixoswiki-smoke-test` and `nixoswiki_smoke_test`.
- Updated skill instructions for sparse-corpus caveats and token discipline.

## Simulation summary

| Scenario | Query | Observed canonical result | Accuracy | Output discipline |
|---|---|---|---:|---:|
| Flakes | `nix flake input follows update` | `nix.dev/source/concepts/flakes.md` #1 | 91 | 88 |
| NixOS config | `environment.systemPackages configuration.nix` | `configuration/config-file.section.md` #1; declarative packages #4 | 88 | 90 |
| Fetchers | `fetchFromGitHub sha256 hash` | `nixpkgs/doc/build-helpers/fetchers.chapter.md` #1 | 93 | 86 |
| Store GC | `nix store garbage collection roots` | `garbage-collection.md` #1, roots #2 | 94 | 94 |
| Dev shell | `nix develop devShell` | `dev-shell-tools.chapter.md` #1; practical guide #2 | 84 | 92 |

## Remaining caveats

- The sparse local corpus does not include all generated command-reference and option-reference pages. Exact option/CLI semantics may need official online verification.
- Some Nixpkgs manual pages are huge and code-heavy; query extraction can still select helper/reference sections instead of beginner workflow pages.
- Source selection matters: use `references/source-map.md` to decide between `nix`, `nix.dev`, and `nixpkgs`.
- `validate_wiki` still flags the setup-command heuristic for this older custom package even though `/nixoswiki-local-setup` exists and is registered.

## Scores

- Accuracy: **88/100**
- Effectiveness: **89/100**
- Token/output discipline: **89/100**
- Final confidence: **88/100**
