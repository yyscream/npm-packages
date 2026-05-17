# Non-NixOS Host Policy

The user may ask NixOS/Nix questions from an Arch-based host or any non-NixOS system.

## Do not assume

Do not assume these exist unless verified:

- `/etc/nixos/configuration.nix`
- `nixos-rebuild`
- systemd services from NixOS modules
- `/nix/var/nix/profiles/system`
- `nix-daemon`
- multi-user Nix installation

## Safe detection

Use read-only checks only when relevant:

```bash
command -v nix
nix --version
command -v nixos-rebuild
cat /etc/os-release
find . -maxdepth 3 -name 'flake.nix' -o -name 'configuration.nix' -o -name 'home.nix' -o -name 'default.nix' -o -name 'shell.nix'
```

## Guidance style

- If `nix` is unavailable, answer from local docs and project files; do not suggest installing Nix unless the user asks.
- If the project has `flake.nix`, prefer flake-aware commands with read-only flags first.
- If the question is about NixOS modules but the host is not NixOS, explain that examples may be intended for a target NixOS machine/configuration repository.
- Avoid host mutations such as enabling daemons, editing `/etc/nix/nix.conf`, or switching generations without explicit approval.
