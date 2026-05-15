# Arch-Based Distribution Notes

Always treat Arch-based distributions as in scope for this skill. Use local ArchWiki first for shared Arch foundations, then account for distro-specific tooling, repositories, kernels, theming, helpers, and support boundaries.

## Priority for this machine/user

1. EndeavourOS — primary daily target.
2. CachyOS — high-priority secondary target.
3. Other Arch-based distributions as relevant: Manjaro, Garuda Linux, Artix Linux, BlackArch, ArcoLinux, ArchLabs, RebornOS, Crystal Linux, XeroLinux, and similar derivatives.

## General policy

- Start with local ArchWiki for common subsystems: pacman, systemd, NetworkManager, PipeWire, kernel modules, boot/initramfs, filesystems, GPU, Bluetooth, AUR/build tooling.
- Detect the actual distro before assuming pure Arch behavior. Prefer read-only commands:
  - `cat /etc/os-release`
  - `hostnamectl`
  - `pacman-conf --repo-list`
  - `pacman -Q | grep -Ei 'endeavouros|cachyos|manjaro|garuda|artix|blackarch'`
  - `uname -r`
- Clearly separate:
  - ArchWiki guidance that applies to the shared Arch base.
  - Distro-specific observations from the current system.
  - Distro-specific advice that may require official distro docs/forums.
- If distro packaging diverges from Arch, do not blindly recommend Arch package names or repository assumptions.
- Ask before changing repositories, mirrors, kernels, init systems, bootloaders, or pacman configuration.

## Distro-specific reference loading

When the distro is known or mentioned, load the matching reference file before final recommendations:

- EndeavourOS: `references/distros/endeavouros.md`
- CachyOS: `references/distros/cachyos.md`
- Manjaro: `references/distros/manjaro.md`
- Garuda Linux: `references/distros/garuda.md`
- Artix Linux: `references/distros/artix.md`
- BlackArch: `references/distros/blackarch.md`

For unknown Arch-based distributions, use this file plus local ArchWiki and system evidence first.
