# CachyOS Troubleshooting Notes

CachyOS is a high-priority Arch-based distro target for this user. Prioritize CachyOS-specific context when `/etc/os-release` or the prompt indicates CachyOS.

## How to identify

Read-only checks:

```bash
cat /etc/os-release
hostnamectl
pacman -Q | grep -Ei 'cachyos|linux-cachyos|cachy'
pacman-conf --repo-list
uname -r
```

Common identifiers include CachyOS package/repository names and CachyOS kernels.

## Troubleshooting policy

- Use local ArchWiki first for common Arch subsystems.
- Then account for CachyOS-specific repositories, optimized packages, kernels, scheduler/performance tuning, and installer choices.
- Do not assume vanilla Arch kernels or repo package versions. Verify installed kernel and repo list first.
- Be careful with recommendations involving kernel modules, NVIDIA, initramfs, CPU scheduler/performance packages, and package downgrades/reinstalls.
- Ask before changing repos, switching kernels, rebuilding initramfs, or replacing optimized packages.

## Useful read-only diagnostics

```bash
cat /etc/os-release
pacman-conf --repo-list
pacman -Q | grep -Ei 'cachyos|linux-cachyos|nvidia|mesa|mkinitcpio|dracut'
uname -r
lspci -k
journalctl -b -p warning..alert
```

## Escalation

When ArchWiki guidance is insufficient or the issue involves CachyOS-specific kernels/repos/optimizations, consult official CachyOS docs/forums after local evidence. Label that as distro-specific external guidance.
