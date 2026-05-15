# Artix Linux Troubleshooting Notes

Artix Linux is Arch-based but commonly differs in init/service management. It may use OpenRC, runit, s6, or dinit instead of systemd.

## Policy

- Use local ArchWiki for shared Arch/pacman/filesystem/networking concepts, but do not assume systemd.
- First identify the init system before recommending `systemctl`/`journalctl` workflows.
- Use Artix-specific service commands when systemd is absent.
- Ask before enabling/disabling services or changing init/service packages.

## Read-only diagnostics

```bash
cat /etc/os-release
ps -p 1 -o comm=
pacman-conf --repo-list
pacman -Q | grep -Ei 'artix|openrc|runit|s6|dinit|systemd'
```

If PID 1 is not systemd, avoid systemd-only troubleshooting except where compatibility packages are installed.
