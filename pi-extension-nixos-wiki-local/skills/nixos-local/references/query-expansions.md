# Query Expansions

The `nixoswiki_search` tool expands common NixOS/Nix terms to improve local documentation recall.

Keep this file aligned with `CONFIG.queryExpansions` in `index.ts`.

## Flakes and commands

- flake/flakes -> flake.nix, flake.lock, nix flake, inputs, outputs
- input/inputs -> flake inputs, follows
- output/outputs -> packages, apps, devShells, nixosConfigurations
- lock -> flake.lock, nix flake lock, nix flake update
- shell -> nix shell, nix develop, devShell, development shell
- devshell/develop -> devShells, nix develop, development shell
- build -> nix build, derivation, realisation, outputs
- run -> nix run, apps, flake apps
- eval -> nix eval, Nix language, attribute path
- repl -> nix repl, Nix language, builtins
- registry -> nix registry, flake registry

## NixOS modules and configuration

- option/options -> module, configuration.nix, nixos option
- module/modules -> options, imports, mkOption, NixOS module
- service/services -> systemd, NixOS module, enable option
- systempackages -> environment.systemPackages, packages, configuration.nix

## nixpkgs packaging

- package/packages -> nixpkgs, derivation, attribute
- nixpkgs -> packages, lib, stdenv, overlays, callPackage
- overlay/overlays -> nixpkgs overlays, override, package set
- override -> overrideAttrs, overlays, package customization
- callpackage -> callPackage, nixpkgs, package arguments
- derivation/derivations -> stdenv, mkDerivation, builder
- mkderivation -> stdenv, derivation, packages
- fetchfromgithub -> fetchFromGitHub, fetchers, hash, sha256
- hash -> sha256, fixed-output derivation, fetchers

## Store, profiles, daemon, and caches

- store -> nix store, /nix/store, garbage collection, gc roots
- gc -> garbage collection, nix store, gc roots, optimise-store
- profile -> nix profile, profiles, install, upgrade
- channel/channels -> nix-channel, legacy nix, nix-env
- daemon -> nix-daemon, multi-user, nix.conf, trusted-users
- substituter/substituters -> binary cache, trusted-public-keys, cache.nixos.org
- cache -> binary cache, substituters, narinfo, cache.nixos.org
- sandbox -> sandboxing, nix.conf, build isolation
- experimental -> experimental-features, nix-command, flakes

## Nix language

- language -> Nix language, builtins, functions, attribute sets
- attrset -> attribute set, attrs, Nix language
- list -> lists, Nix language, builtins
- function -> functions, lambda, Nix language
- import -> imports, modules, Nix language
