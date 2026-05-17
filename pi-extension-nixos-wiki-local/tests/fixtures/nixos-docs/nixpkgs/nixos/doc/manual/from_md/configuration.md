# NixOS Configuration

NixOS systems are configured through `configuration.nix` and the NixOS module system.

## Options

NixOS options are declared by modules. Use `services.openssh.enable = true;` to enable OpenSSH.

See [Packages](packages.md) for system packages.

## Rebuild

Apply a configuration with `nixos-rebuild switch`. This changes the running system and should not be done without user approval.
