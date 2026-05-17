# NixOS Wiki Local Pi Extension

Local NixOS/Nix documentation retrieval for Pi, backed by the shared `pi-utils` local-wiki engine.

## Sources

The setup command creates minimal sparse, shallow, blob-filtered checkouts under `~/.nixoswiki`:

- `NixOS/nixpkgs` — `doc/` and `nixos/doc/`
- `NixOS/nix.dev` — `source/`
- `NixOS/nix` — `doc/`

Sparse checkout patterns exclude common images, archives, media, fonts, and binary artifacts to keep the local corpus focused on documentation text.

## Commands

- `/nixoswiki-status` — show docs path, page count, repository revisions, and cache timestamp.
- `/nixoswiki-local-setup` — clone/update the three official documentation sources.

Set `NIXOSWIKI_DOCS_PATH=/path/to/docs` to override the corpus path, useful for tests.

## Tools

- `nixoswiki_search`
- `nixoswiki_read`
- `nixoswiki_sections`
- `nixoswiki_extract`
- `nixoswiki_related`

## Skill references

The packaged `nixos-local` skill includes reference notes matching the ArchWiki-local style:

- `references/troubleshooting-policy.md`
- `references/safety-rules.md`
- `references/query-expansions.md`
- `references/source-map.md`
- `references/non-nixos-host-policy.md`

## Mock tests

These tests use local fixture docs and do not require NixOS:

```bash
cd pi-extension-nixos-wiki-local
bun tests/mocktest.ts
```
