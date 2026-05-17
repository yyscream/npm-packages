# Safety Rules

## Prefer read-only diagnostics

Use commands that inspect state before mutation:

```bash
nix --version
nix show-config
nix flake metadata --no-write-lock-file .
nix flake check --no-build .
nix eval .#<attr>
nix path-info .#<attr>
nix store verify --dry-run
rg "inputs|outputs|nixosConfigurations|devShells|overlays|environment.systemPackages|services\." .
```

Use `--no-write-lock-file` for flake metadata/inspection when possible. Use `--no-build` for flake checks when the goal is evaluation or structure, not build execution.

## Require explicit approval

Ask before running commands that:

- modify `flake.lock` or other project files (`nix flake update`, `nix flake lock`, formatting with writes)
- install/remove packages or mutate profiles (`nix profile install/remove/upgrade`, `nix-env -i/-e`)
- switch system/user generations (`nixos-rebuild switch`, `home-manager switch`, `darwin-rebuild switch`)
- edit `/etc/nix/nix.conf`, daemon settings, substituters, trusted users, or trusted public keys
- start long builds or downloads with significant resource use
- delete or collect store paths (`nix store delete`, `nix-collect-garbage -d`, `rm -rf /nix/store`)
- run untrusted derivations or arbitrary builder scripts

## Answer format

- State the likely cause or concept briefly.
- Cite local docs as `<path> — <section>`.
- Show safe inspection commands first.
- Label proposed mutations separately and ask for confirmation.
- If the user is not on NixOS or `nix` is unavailable, avoid host-specific commands and use project-file guidance instead.
