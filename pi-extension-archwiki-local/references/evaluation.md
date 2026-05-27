# ArchWiki Local Evaluation

Date: 2026-05-27  
Package: `@firstpick/pi-extension-archwiki-local`  
Skill: `arch-linux-local`  
Confidence after migration pass: **90/100**

## Corpus profile

- Local docs path: `/usr/share/doc/arch-wiki/html/en`
- Source package: `arch-wiki-docs 20260501-1`
- Parser/format: HTML -> text through shared `pi-utils` local-wiki engine
- Indexed extensions: `.html`, `.htm`
- Indexed page count observed: `2498`

## Migration changes applied

- Bumped cache schema to rebuild with improved parser/output behavior.
- Added corpus-specific `SEARCH_STOPWORDS` and `TERM_WEIGHTS` to reduce broad Arch/Linux/help-term noise.
- Added compact search default; snippets are returned only with `includeSnippets: true`.
- Added `maxSections` support for `archwiki_sections` and `archwiki_extract`.
- Added extract metadata: `totalMatchedSections`, `omittedSectionCount`, and bounded default output.
- Added `/archwiki-smoke-test` and `archwiki_smoke_test`.
- Updated skill instructions for `search -> sections -> exact section extract` and token discipline.

## Simulation summary

| Scenario | Query | Observed canonical result | Accuracy | Output discipline |
|---|---|---|---:|---:|
| Package signing | `pacman invalid signature keyring` | `Pacman/Package_signing.html` #1 | 95 | 93 |
| Audio | `pipewire no audio wireplumber` | `PipeWire.html` #1, PulseAudio close #2 | 90 | 84 |
| Encryption/boot | `mkinitcpio luks encrypt boot` | `Dm-crypt/Encrypting_an_entire_system.html` #1 | 90 | 78 |
| DNS | `networkmanager dns systemd resolved` | `Systemd-resolved.html` #1 | 94 | 84 |
| AUR | `aur makepkg pkgbuild` | `Arch_User_Repository.html` #1 | 93 | 84 |

## Remaining caveats

- ArchWiki pages can be very large and command-heavy. HTML-to-text conversion still sometimes leaves command lines that look like headings in sections, especially on dm-crypt pages.
- Query extraction can still select noisy sections on huge troubleshooting pages. Prefer exact section extraction after listing headings.
- `validate_wiki` still flags the setup-command heuristic for this older custom package even though `/archwiki-local-setup` exists and is registered.

## Scores

- Accuracy: **92/100**
- Effectiveness: **90/100**
- Token/output discipline: **87/100**
- Final confidence: **90/100**
