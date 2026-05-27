---
name: arch-linux-local
description: Always use for Arch Linux and Arch-based distro troubleshooting, especially EndeavourOS and CachyOS, including pacman, systemd/init, NetworkManager/DNS/Wi-Fi, PipeWire/audio, boot/initramfs/mkinitcpio, GPU/Wayland, Bluetooth, filesystems, or package/signature issues. Use local ArchWiki evidence before web sources; the user should not need to explicitly ask for local ArchWiki.
---

# Arch Linux Local Troubleshooting

Always use this skill for Arch Linux and Arch-based distribution troubleshooting on this machine. Prioritize EndeavourOS first and CachyOS second when distro context matters. Prefer the installed local ArchWiki (`arch-wiki-docs`) before web searches. The user should not need to say “use local ArchWiki first”; if the issue looks Arch/Linux-related, start with local ArchWiki retrieval.

## Setup requirement

This skill requires the local ArchWiki documentation package:

```bash
sudo pacman -S arch-wiki-docs
```

If `/usr/share/doc/arch-wiki/html/en/` is missing or empty, warn the user to install `arch-wiki-docs` with the command above and abort ArchWiki-local troubleshooting. If the extension command is available, the user can also run `/archwiki-local-setup` to install it when non-interactive sudo/root access permits.

After package/corpus changes, verify local behavior with `/archwiki-smoke-test` or `archwiki_smoke_test({ maxSearchResults: 5 })`.

## Required workflow

1. Start with `archwiki_search({ query, limit: 5, includeSnippets: false })` for Arch/Linux issues.
2. Use `archwiki_sections({ page, maxSections: 40-80 })` when the right page is found but the relevant heading is unclear.
3. Prefer exact `archwiki_extract({ page, section, maxChars: 4000-8000, maxSections: 2-5 })` for final citations.
4. Use query extraction only for exploration, then switch to exact section names when possible.
5. Use `archwiki_read` only when broad page context is needed.
6. Use `archwiki_related` when the issue spans subsystems.
7. Detect the distro when relevant, especially EndeavourOS or CachyOS, using read-only evidence.
8. Load distro-specific reference docs when the distro is known or mentioned.
9. Run read-only local diagnostics when system evidence is relevant.
10. Compare documentation guidance with observed system state.
11. Cite local ArchWiki page paths and section names in final answers.
12. Ask before destructive or user-facing system changes.

## Source priority

1. Local ArchWiki from `/usr/share/doc/arch-wiki/html/en/` via the ArchWiki tools for shared Arch foundations.
2. Local distro/system evidence: `/etc/os-release`, package metadata, repositories, service status, logs, config files.
3. Packaged distro reference notes, especially EndeavourOS and CachyOS.
4. Official online ArchWiki, Arch Linux docs, or official distro docs only when local docs are missing, stale, or insufficient.
5. Other sources only when necessary and clearly labeled.

## Tool usage

- `archwiki_search({ query, limit, includeSnippets })`: find candidate pages. Keep `limit` at 5 unless exploring broadly; snippets default off.
- `archwiki_sections({ page, maxSections })`: inspect available headings before extracting from large pages.
- `archwiki_extract({ page, section, maxChars, maxSections })`: retrieve focused exact sections; best for final answers.
- `archwiki_extract({ page, query, maxChars, maxSections })`: retrieve query-relevant sections; best for exploration.
- `archwiki_read({ page, maxChars })`: retrieve clean readable page text; use sparingly.
- `archwiki_related({ page, limit })`: discover linked local pages.
- `archwiki_smoke_test({ maxSearchResults })`: verify parser/search/extract/read behavior after package or corpus updates.

## Diagnostics policy

Prefer read-only commands first. Examples:

```bash
cat /etc/os-release
hostnamectl
pacman-conf --repo-list
uname -a
pacman -Q
pacman -Qi <pkg>
pacman -Qo <file>
systemctl status <unit>
journalctl -b -u <unit>
ip addr
ip route
resolvectl status
loginctl session-status
lsblk -f
findmnt
```

Avoid mutation without explicit user approval:

```bash
pacman -R
pacman -Syu
rm -rf
mkfs.*
systemctl disable <unit>
systemctl mask <unit>
mount # with write-changing intent
```

## Token/output discipline

- Prefer `search -> sections -> exact section extract` for final answers.
- Keep search limits small (`limit: 5-10`) and snippets off unless needed.
- Use `maxSections` around 2-5 and `maxChars` around 4000-8000 for focused extracts.
- If `omittedSectionCount` or `truncated: true` affects confidence, say so explicitly.

## Citation format

Use local source citations like:

```txt
Sources:
- /usr/share/doc/arch-wiki/html/en/Systemd.html — Basic systemctl usage
- /usr/share/doc/arch-wiki/html/en/Pacman/Package_signing.html — Signature checking
```

See references:
- `references/troubleshooting-policy.md`
- `references/query-expansions.md`
- `references/safety-rules.md`
- `references/arch-based-distros.md`
- `references/distros/endeavouros.md` (priority distro)
- `references/distros/cachyos.md` (priority distro)
- `references/distros/manjaro.md`
- `references/distros/garuda.md`
- `references/distros/artix.md`
- `references/distros/blackarch.md`
