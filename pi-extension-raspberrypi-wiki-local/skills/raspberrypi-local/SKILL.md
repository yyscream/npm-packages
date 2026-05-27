---
name: raspberrypi-local
description: Use automatically for Raspberry Pi computers, Raspberry Pi OS, Raspberry Pi Imager, raspi-config, config.txt/cmdline.txt, GPIO, HATs/accessories, camera/rpicam/libcamera/Picamera2, SSH/VNC/Connect, bootloader/EEPROM/NVMe/USB boot, Compute Module, Pico/RP2040/RP2350/Pico SDK/MicroPython, and Raspberry Pi documentation questions. Prefer local Raspberry Pi Documentation evidence via raspberrypi_wiki tools before web sources.
---

# Raspberry Pi Documentation Local Wiki

Use the local official Raspberry Pi Documentation corpus before web sources. Optimize for source-backed answers with bounded output and local path citations.

## Corpus profile

- Local checkout path: `~/.raspberrypiwiki`
- Indexed source: official `raspberrypi/documentation` repository, primarily `documentation/asciidoc/`
- Parser/format: AsciiDoc
- Indexed extensions: `.adoc`, `.asciidoc`, `.asc`
- Setup command: `/raspberrypi-wiki-local-setup`
- Smoke test: `/raspberrypi_wiki-smoke-test` or `raspberrypi_wiki_smoke_test({ maxSearchResults: 5 })`

The repository contains source files used to build the public Raspberry Pi Documentation site. It also has build/tooling Markdown files; the local wiki intentionally indexes only AsciiDoc documentation files to avoid build-doc noise in support searches.

## Confidence target

Aim for **90-95/100 confidence** by combining local documentation evidence, exact section citations, read-only local evidence when relevant, and explicit caveats when docs/output are incomplete.

If confidence is below 90/100, improve it by searching a second wording, listing sections, extracting exact sections, checking related pages, checking official online docs for freshness, or asking for missing hardware/OS details.

## Required workflow

1. Start with `raspberrypi_wiki_search({ query, limit: 5, includeSnippets: false })`.
2. If the page is large or aggregate-like, run `raspberrypi_wiki_sections({ page, maxSections: 40-80 })`.
3. Prefer exact section extraction for final evidence:
   - `raspberrypi_wiki_extract({ page, section, maxChars: 4000-8000, maxSections: 2-5 })`
4. Use query extraction only for exploration, then switch to exact headings when available.
5. Use `raspberrypi_wiki_read({ page, maxChars })` only for broad context or when no relevant heading is identifiable.
6. Use `raspberrypi_wiki_related({ page, limit: 5-10 })` when the issue spans linked topics.
7. Run read-only local diagnostics when system/project evidence is relevant.
8. Compare documentation guidance with observed local state.
9. Cite local paths and section names in final answers.
10. Ask before destructive, persistent, hardware-risk, or user-facing changes.

## Search hints

Use specific Raspberry Pi terms and current tool names:

- SSH/headless: `ssh headless setup`, `raspi-config ssh`, `imager remote access`.
- Camera: `rpicam libcamera picamera2`, `rpicam options`, `camera_auto_detect`, `camera module`.
- Boot/config: `config.txt dtoverlay dtparam`, `cmdline.txt`, `device tree overlay`.
- GPIO: `gpio pinout pinctrl`, `40-pin header`, `raspi-gpio`.
- Storage/boot: `nvme boot pi 5`, `usb boot`, `bootloader eeprom BOOT_ORDER`.
- Network/remote desktop: `wifi networkmanager nmcli`, `vnc`, `raspberry pi connect`.
- Pico/microcontrollers: `pico sdk blink`, `rp2040`, `rp2350`, `micropython`.
- Accessories/HATs: include the product name, e.g. `sense hat`, `ai camera`, `m.2 hat+`.

## Source priority

1. Local Raspberry Pi Documentation corpus via `raspberrypi_wiki_*` tools.
2. Local project/system evidence relevant to the user's current Raspberry Pi or host environment.
3. Official online Raspberry Pi Documentation/GitHub only when local docs are missing, stale, or insufficient.
4. Other sources only when necessary and clearly labeled.

## Tool usage

- `raspberrypi_wiki_search({ query, limit, includeSnippets })`: find candidate pages. Keep `limit` at 5 unless exploring broadly; snippets default off.
- `raspberrypi_wiki_sections({ page, maxSections })`: inspect headings before extracting from large pages.
- `raspberrypi_wiki_extract({ page, section, maxChars, maxSections })`: retrieve focused exact sections; best for final answers.
- `raspberrypi_wiki_extract({ page, query, maxChars, maxSections })`: retrieve query-relevant sections; best for exploration.
- `raspberrypi_wiki_read({ page, maxChars })`: retrieve broad page text; use sparingly.
- `raspberrypi_wiki_related({ page, limit })`: discover linked local pages.
- `raspberrypi_wiki_smoke_test({ maxSearchResults })`: verify parser/search/extract/read/related behavior after package or corpus updates.

## Diagnostics policy

Prefer read-only commands first and only run commands relevant to the user's issue/environment. Useful Raspberry Pi diagnostics include:

```bash
uname -a
tr -d '\0' </proc/device-tree/model 2>/dev/null || cat /proc/device-tree/model 2>/dev/null || true
cat /etc/os-release
vcgencmd version 2>/dev/null || true
vcgencmd get_throttled 2>/dev/null || true
command -v raspi-config >/dev/null && raspi-config nonint get_config_var arm_64bit /boot/firmware/config.txt 2>/dev/null || true
grep -RsnE '^(dtoverlay|dtparam|camera_auto_detect|display_auto_detect|arm_64bit|boot_order|program_usb_boot_mode)' /boot/config.txt /boot/firmware/config.txt 2>/dev/null || true
ip -brief addr 2>/dev/null || true
systemctl status ssh --no-pager 2>/dev/null || true
lsblk -f 2>/dev/null || true
```

For Pico/Pico SDK work, prefer read-only project checks first:

```bash
cmake --version 2>/dev/null || true
python3 --version 2>/dev/null || true
printenv PICO_SDK_PATH PICO_TOOLCHAIN_PATH 2>/dev/null || true
find . -maxdepth 3 -name CMakeLists.txt -o -name pico_sdk_import.cmake 2>/dev/null
```

## Safety policy

Ask before mutation, especially:

- Editing `/boot/firmware/config.txt`, `/boot/config.txt`, `/boot/firmware/cmdline.txt`, EEPROM/bootloader configuration, NetworkManager profiles, or system services.
- Running `rpi-eeprom-update`, `rpi-update`, firmware flashing, SD-card/USB/NVMe imaging, partitioning, formatting, or boot-order changes.
- Installing/removing packages, enabling remote access, changing passwords/SSH keys, or exposing services to a network.
- GPIO, HAT, camera, display, or power-supply wiring changes. Tell the user to power down before physical wiring changes when appropriate.

Do not assume non-Raspberry-Pi Linux hosts behave like Raspberry Pi OS. Verify model, OS release, boot path, and relevant commands first.

## Token/output discipline

- Keep search limits small (`limit: 5-10`) and leave snippets off unless they are needed.
- Prefer `search -> sections -> exact section extract` for final answers.
- Use query extraction only to discover likely sections on large pages.
- Use `maxChars` around 4000-8000 and `maxSections` around 2-5 for focused answers.
- Use `read` only when the relevant section cannot be identified.
- If a tool reports `omittedSectionCount` or `truncated: true`, mention it when it affects confidence.

## Citation format

Use local source citations like:

```txt
Sources:
- ~/.raspberrypiwiki/documentation/asciidoc/computers/remote-access/ssh.adoc — Enable the SSH server
- ~/.raspberrypiwiki/documentation/asciidoc/computers/raspberry-pi/boot-nvme.adoc — NVMe SSD boot
```
