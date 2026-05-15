# Manjaro Troubleshooting Notes

Manjaro is Arch-based but diverges more from Arch than EndeavourOS in repository cadence, kernels, tooling, and defaults.

## Policy

- Use local ArchWiki for shared subsystems, but do not assume Arch repository timing or package versions.
- Verify Manjaro identity and repositories before recommending package operations.
- Be cautious with AUR advice because Manjaro's delayed repositories can create dependency/version mismatches.
- Ask before switching branches, changing mirrors, or replacing kernels.

## Read-only diagnostics

```bash
cat /etc/os-release
pacman-conf --repo-list
pacman -Q | grep -Ei 'manjaro|mhwd|pamac|linux[0-9]'
uname -r
mhwd-kernel -li 2>/dev/null || true
```
