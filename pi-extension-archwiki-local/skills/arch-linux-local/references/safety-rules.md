# Safety Rules

## Prefer read-only diagnostics

Use commands that inspect state before mutation: `uname`, `pacman -Q/-Qi/-Qo`, `systemctl status`, `journalctl`, `ip`, `resolvectl`, `loginctl`, `lsblk -f`, and `findmnt`.

## Require explicit approval

Ask before running commands that install/remove packages, edit system configuration, change enabled/masked services, modify bootloader/initramfs state, delete lock files, format/mount writable filesystems, or recursively delete data.

## Answer format

- Summarize likely causes.
- Cite local ArchWiki files/sections.
- List safe inspection commands first.
- Label any proposed mutations and ask for confirmation.
