---
name: nixos-local
description: Use automatically for NixOS, Nix, nixpkgs, flakes, Nix language, Home Manager-adjacent Nix configuration, nix commands, NixOS modules/options, packages, overlays, derivations, and troubleshooting. Prefer local official NixOS/Nix documentation evidence via nixoswiki tools before web sources.
---

# NixOS/Nix Local Wiki

Use the local official NixOS/Nix documentation corpus before web sources.

## Setup requirement

This skill requires the local documentation corpus at:

```txt
~/.nixoswiki
```

If the corpus is missing or empty, tell the user to run:

```txt
/nixoswiki-local-setup
```

The setup command is designed to be idempotent and minimal: shallow, sparse, blob-filtered Git checkouts with common images/binaries excluded.

## Required workflow

1. Classify the question: Nix command, flake workflow, Nix language, NixOS module/option, nixpkgs packaging/overlay, or store/cache/daemon/profile issue.
2. Start with `nixoswiki_search` for NixOS/Nix issues.
3. Use `nixoswiki_sections` when the right page is found but the relevant heading is unclear.
4. Use `nixoswiki_extract` for focused local citations.
5. Use `nixoswiki_read` only when broad page context is needed.
6. Use `nixoswiki_related` when the issue spans linked topics.
7. Run read-only local diagnostics when system/project evidence is relevant.
8. Compare documentation guidance with observed local state.
9. Cite local paths and section names in final answers.
10. Ask before destructive or user-facing changes.

## Source priority

1. Local official NixOS/Nix corpus via `nixoswiki_*` tools.
2. Local project/system evidence relevant to the user's current environment.
3. Official online NixOS/Nix documentation only when local docs are missing, stale, or insufficient.
4. Other sources only when necessary and clearly labeled.

## Local source selection

Use `references/source-map.md` when choosing which official corpus to trust first:

- `~/.nixoswiki/nix/` for Nix CLI, Nix language, store, daemon, and `nix.conf` behavior.
- `~/.nixoswiki/nixpkgs/` for NixOS modules/options and nixpkgs packaging/overlays/stdenv.
- `~/.nixoswiki/nix.dev/` for tutorials, learning paths, and practical examples.

For flakes, combine `NixOS/nix` command semantics with `NixOS/nix.dev` practical workflow guidance when available.

## Read-only diagnostics examples

Use these only when relevant and available on the current system:

```bash
nix --version
nix flake metadata --no-write-lock-file .
nix flake check --no-build .
nix eval --raw nixpkgs#hello.name
rg "services\.|environment\.systemPackages|programs\." .
```

Do not assume the user is on NixOS. If `nix` is absent, rely on local docs and project files instead of attempting package installation. Load `references/non-nixos-host-policy.md` when host assumptions matter.

Avoid mutation without explicit approval:

```bash
nixos-rebuild switch
nix profile install
nix-env -iA
rm -rf /nix/store
```

## Citation format

Use local source citations like:

```txt
Sources:
- ~/.nixoswiki/nixpkgs/nixos/doc/manual/configuration/configuration.md — Relevant section
- ~/.nixoswiki/nix.dev/source/tutorials/first-steps/index.md — Relevant section
```

See references:

- `references/troubleshooting-policy.md`
- `references/safety-rules.md`
- `references/query-expansions.md`
- `references/source-map.md`
- `references/non-nixos-host-policy.md`
