# EndeavourOS Troubleshooting Notes

EndeavourOS is the primary Arch-based distro target for this user. Prioritize EndeavourOS-specific context when `/etc/os-release` or the prompt indicates EndeavourOS.

## How to identify

Read-only checks:

```bash
cat /etc/os-release
hostnamectl
pacman -Q | grep -Ei 'endeavouros|eos-'
pacman-conf --repo-list
```

Common identifiers include `ID=endeavouros` and EndeavourOS/eos packages or repositories.

## Troubleshooting policy

- Use local ArchWiki first for shared Arch components.
- Then account for EndeavourOS additions such as `eos-*` packages, welcome/update helpers, mirrors, Calamares install choices, selected desktop environment, and installed kernels.
- Treat EndeavourOS as close to Arch, but verify package/repository state before recommending package operations.
- For update/mirror issues, inspect pacman configuration and repo list before proposing mirror refresh or package reinstall commands.
- For boot/kernel issues, check installed kernels and initramfs tooling before assuming a specific kernel.

## EndeavourOS quirks versus vanilla Arch

### Dracut is the modern EndeavourOS default

EndeavourOS switched to `dracut` as the default initramfs generator as of the Cassini release in 2022. Do not assume `mkinitcpio` when troubleshooting boot/initramfs/kernel issues. First verify whether the system uses `dracut`, `eos-dracut`, `kernel-install-for-dracut`, or legacy `mkinitcpio`.

- Rebuild initrds with `sudo dracut-rebuild` on GRUB/dracut systems.
- On default systemd-boot + dracut setups, EndeavourOS documents `sudo reinstall-kernels` for updating kernel boot images.
- Dracut configuration lives in drop-ins under `/etc/dracut.conf.d/` plus EndeavourOS config such as `/etc/eos-dracut.conf` or `/etc/kernel-install-for-dracut.conf`.
- Bootloader matters: EndeavourOS pairs systemd-boot with `kernel-install-for-dracut`, and GRUB/other bootloaders with `eos-dracut`.
- For LUKS/encrypted setups, dracut may need explicit config such as `install_items+=" /etc/crypttab ..."`; do not blindly translate mkinitcpio HOOKS advice.

Sources: EndeavourOS Discovery “Dracut”; EndeavourOS `eos-dracut` package notes.

### Two mirror lists, not one

EndeavourOS systems commonly use two mirror lists:

- Arch mirrors: `/etc/pacman.d/mirrorlist`
- EndeavourOS mirrors: `/etc/pacman.d/endeavouros-mirrorlist`

Most packages still come from Arch mirrors, so Arch mirror problems are common, but EndeavourOS repo packages depend on the EndeavourOS mirror list. Diagnose update/download failures by checking both lists and the configured repositories.

- Arch mirrors may be managed with `reflector`, `reflector-simple`, `rate-mirrors`, or the EndeavourOS welcome app.
- EndeavourOS mirrors may be ranked with `eos-rankmirrors` or `rate-mirrors`.
- Pacman uses mirrors in listed order, so ranking/order affects package downloads.

Sources: EndeavourOS Important News `general-tips.md`; EndeavourOS Discovery “Automatically ranking the mirror list”.

### Separate keyring concerns

EndeavourOS notes that Arch and EndeavourOS repositories have their own keyrings. For signature/update problems, check both Arch keyring state and EndeavourOS repository/keyring context before applying generic Arch-only fixes.

Useful read-only checks:

```bash
pacman -Q archlinux-keyring endeavouros-keyring 2>/dev/null || true
systemctl status archlinux-keyring-wkd-sync.timer
pacman-conf --repo-list
```

The EndeavourOS tips mention `sudo pacman -Sy archlinux-keyring && sudo pacman -Su` as a sometimes-useful fix, but treat it as a mutation requiring user approval.

Source: EndeavourOS Important News `general-tips.md`.

### Welcome app and eos helper tooling

EndeavourOS includes helper tooling that vanilla Arch does not, especially the `welcome` / `eos-welcome` app. It can expose maintenance actions such as updating the system and mirrors or managing package cache.

When troubleshooting user actions, ask whether the change was made through the Welcome app, `eos-*` tools, `pacman`, or an AUR helper. Prefer command-line evidence over assumptions.

Source: EndeavourOS Important News `general-tips.md`.

### Package management guidance: prefer pacman/yay over GUI managers

EndeavourOS explicitly recommends using `pacman` or `yay` for install/update/remove operations rather than favoring GUI package managers, because CLI tools expose more reliable details during failures. For support answers, ask for CLI output (`pacman`, `yay`) instead of relying on GUI summaries.

EndeavourOS also cautions against careless AUR usage and package removal. AUR packages are community-maintained; inspect PKGBUILDs and build output when relevant.

Source: EndeavourOS Important News `general-tips.md`.

### Kernel fallback and headers matter

EndeavourOS recommends installing two kernels, typically `linux` plus `linux-lts`, and matching headers (`linux-headers`, `linux-lts-headers`) when DKMS packages are involved. For current NVIDIA DKMS guidance, do **not** recommend the old `nvidia-dkms` package; Arch has moved the main DKMS path to `nvidia-open-dkms` / open kernel modules. For kernel/NVIDIA/DKMS issues, verify installed NVIDIA packages, GPU generation compatibility, kernel/header pairs, and current repository availability before suggesting driver rebuilds.

Source: EndeavourOS Important News `general-tips.md`.

### NVIDIA and Intel graphics notes

Older EndeavourOS tips may mention `nvidia-dkms`, but that package recommendation is stale on current Arch/EndeavourOS systems. Prefer checking for `nvidia-open-dkms`, `nvidia-open`, and related current NVIDIA packages, and verify GPU generation support because open kernel modules do not support every legacy NVIDIA card. `nvidia-inst` may still be relevant as an EndeavourOS helper, but inspect what it plans before applying changes. For Intel graphics, `xf86-video-intel` may be needed only for very old GPUs; newer Intel/ARC hardware may fail if `xf86-video-intel` is installed.

Source: EndeavourOS Important News `general-tips.md`.

### Avoid grub-customizer

EndeavourOS specifically recommends against installing/using `grub-customizer`, noting it has caused serious boot problems. For GRUB boot issues, check whether `grub-customizer` was used before applying ArchWiki GRUB guidance.

Source: EndeavourOS Important News `general-tips.md`.

### Package cache can fill disks

EndeavourOS calls out package cache growth as a common maintenance issue. For low disk space/update failures, inspect `/var/cache/pacman/pkg` and filesystem usage first; `paccache` or `paccache-service-manager` may be relevant, but cache cleanup is a mutation requiring approval.

Source: EndeavourOS Important News `general-tips.md`.

## Useful read-only diagnostics

```bash
cat /etc/os-release
pacman-conf --repo-list
pacman -Q | grep -Ei 'endeavouros|eos-|linux|kernel|mkinitcpio|dracut|kernel-install|nvidia|nvidia-open|dkms|keyring'
pacman -Q archlinux-keyring endeavouros-keyring 2>/dev/null || true
pacman-conf --repo-list
grep -R "^Server" /etc/pacman.d/mirrorlist /etc/pacman.d/endeavouros-mirrorlist 2>/dev/null | head -40
uname -r
ls /boot
find /etc/dracut.conf.d -maxdepth 1 -type f -print 2>/dev/null
systemctl status NetworkManager
systemctl status archlinux-keyring-wkd-sync.timer
journalctl -b -p warning..alert
```

## Escalation

When ArchWiki guidance is insufficient or the issue is clearly EndeavourOS-specific, consult official EndeavourOS docs/forums after local evidence. Label that as distro-specific external guidance.
