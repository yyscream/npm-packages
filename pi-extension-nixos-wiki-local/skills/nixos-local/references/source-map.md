# Source Map

The local corpus is assembled from three official GitHub repositories under `~/.nixoswiki`.

## `NixOS/nixpkgs`

Local path:

```txt
~/.nixoswiki/nixpkgs/
```

Sparse paths:

```txt
doc/
nixos/doc/
```

Best for:

- NixOS manual material
- NixOS modules/options explanations
- nixpkgs manual topics
- packaging, stdenv, overlays, package customization
- library and contributor-oriented nixpkgs guidance

## `NixOS/nix.dev`

Local path:

```txt
~/.nixoswiki/nix.dev/
```

Sparse paths:

```txt
source/
```

Best for:

- Tutorials and learning-oriented explanations
- Flakes and modern workflows
- Development environments
- Practical examples for users new to Nix

## `NixOS/nix`

Local path:

```txt
~/.nixoswiki/nix/
```

Sparse paths:

```txt
doc/
```

Best for:

- Nix command reference
- Nix language reference
- Store behavior
- `nix.conf`, daemon, experimental features
- CLI semantics independent of NixOS

## Choosing sources

- For `nix <command>` behavior, prefer `NixOS/nix` first.
- For NixOS configuration/options/modules, prefer `NixOS/nixpkgs` first.
- For tutorials and conceptual examples, prefer `NixOS/nix.dev` first.
- For packaging/overlays/stdenv, prefer `NixOS/nixpkgs` first.
- For flakes, use both `NixOS/nix` command docs and `NixOS/nix.dev` practical guidance when available.
