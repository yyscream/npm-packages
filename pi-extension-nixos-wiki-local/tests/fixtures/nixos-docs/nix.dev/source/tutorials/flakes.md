# Nix Flakes

Flakes provide reproducible inputs through `flake.nix` and `flake.lock`.

## flake check

Run `nix flake check` to evaluate checks. Use `--no-build` when you want read-only-ish evaluation without building outputs.

## flake metadata

`nix flake metadata --no-write-lock-file` inspects a flake without updating the lock file.
