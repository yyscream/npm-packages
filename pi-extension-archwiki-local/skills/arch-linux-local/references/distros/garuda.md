# Garuda Linux Troubleshooting Notes

Garuda Linux is Arch-based with opinionated defaults, Btrfs/Snapper usage on many installs, custom tools, performance tweaks, and themed desktop choices.

## Policy

- Use local ArchWiki for shared Arch components.
- Verify Garuda-specific tooling and filesystem layout before recommending fixes.
- Pay attention to Btrfs snapshots, Snapper, bootloader integration, custom kernels, and Garuda assistant/update tools.
- Ask before changing snapshots, bootloader entries, kernels, or performance-tuning packages.

## Read-only diagnostics

```bash
cat /etc/os-release
pacman-conf --repo-list
pacman -Q | grep -Ei 'garuda|snapper|btrfs|linux|mkinitcpio|dracut'
findmnt
lsblk -f
uname -r
```
