# @firstpick/pi-extension-release-aur

Pi package for safely creating, checking, reviewing, committing, and pushing AUR packages.

## Commands

Primary triggers:

```text
/release-aur
/release-aur-setup
```

Subcommands:

```text
/release-aur [plan] [target|all] [--chroot] [--repro] [--no-agent-review]
/release-aur publish [target|all] [--chroot] [--repro]
/release-aur create <pkgbase> [--push] [--chroot] [--repro] [--no-agent-review]
/release-aur logs
/release-aur abort
/release-aur toggle

/release-aur-setup
/release-aur-setup ssh
/release-aur-setup status
/release-aur-setup abort
/release-aur-setup help
```

Default `/release-aur` action is `plan`.

`/release-aur-setup` opens a native Pi setup menu. The first workflow is AUR SSH publishing access:

- checks required local tools: `ssh`, `ssh-keygen`, `git`;
- `/release-aur-setup status` checks local SSH files/config and also runs the AUR SSH connection test;
- the setup flow checks `~/.ssh/config` first; if `Host aur.archlinux.org` already exists, it immediately tests the current SSH connection before creating keys or editing config;
- creates `~/.ssh` with private permissions if needed;
- can create a dedicated `~/.ssh/aur` Ed25519 key, or use an existing key path;
- prefers the ArchWiki-recommended dedicated AUR key model so the key can be revoked independently;
- configures `Host aur.archlinux.org` with `User aur`, `IdentityFile ~/.ssh/aur`, and `IdentitiesOnly yes`;
- displays and can copy the public key so the user can add it in AUR `My Account` → `SSH Public Key`;
- tests the SSH connection with `ssh -T aur.archlinux.org` after the user confirms the public key is added; setup/status tests use OpenSSH `accept-new`, so they may add `aur.archlinux.org` to `~/.ssh/known_hosts`.

For fully automated key creation, the setup can create an empty-passphrase key only after a warning and explicit confirmation. Use the manual command option if you want `ssh-keygen` to prompt for a passphrase.

## Safety model

`/release-aur plan`:

- runs in a temporary copy of the package directory;
- verifies `makepkg --printsrcinfo` and compares it to committed `.SRCINFO`;
- runs `makepkg --verifysource`;
- runs a full `makepkg --clean --cleanbuild --force --noconfirm` build without `--syncdeps`;
- inspects built package metadata/file count with `pacman -Qip`/`pacman -Qlp` when available;
- runs `namcap` on `PKGBUILD` and built package artifacts when available;
- treats `namcap` `E:` findings as blockers by default;
- optionally runs `pkgctl build` with `--chroot`;
- optionally runs `makerepropkg` with `--repro`;
- saves a log under `~/.pi/agent/release-aur-logs/`;
- queues an agent GO/NO-GO review prompt before any push.

`/release-aur publish`:

- re-runs preflight checks first;
- requires interactive user confirmation;
- regenerates `.SRCINFO` using `makepkg --printsrcinfo > .SRCINFO`;
- stages `PKGBUILD`, `.SRCINFO`, tracked changes, and safe helper-file patterns only;
- refuses obvious artifacts such as `src/`, `pkg/`, `*.pkg.tar.*`, and `*.src.tar.*`;
- runs `git diff --cached --check`;
- commits with `Initial import` or `Update <pkgbase> to <pkgver>-<pkgrel>`;
- pushes explicitly to AUR `master` with `git push <aur-remote> HEAD:master`.

`/release-aur create <pkgbase>` is an idempotent/convergent setup flow:

- missing or empty `<pkgbase>/`: clone `ssh://aur@aur.archlinux.org/<pkgbase>.git`;
- existing Git repo: ensure an AUR remote exists and generate `.SRCINFO` if `PKGBUILD` exists;
- existing non-Git directory with `PKGBUILD`: move it to `<pkgbase>.pkgbuild-staging.<timestamp>`, clone the AUR repo into `<pkgbase>/`, copy safe package files back, and generate `.SRCINFO`;
- conflicting package files in a non-empty AUR clone are refused for manual merge instead of overwritten.

If no `PKGBUILD` exists after setup, Pi prompts natively:

- `Yes, let Agent create it.` — queues an agent task to write the PKGBUILD.
- `Yes, add it from: /Path/to/file` — copies an existing PKGBUILD into the AUR repo and continues.
- `No, but create a template PKGBUILD.` — opens a native Pi selector for bundled templates under `templates/pkgbuild/`:
  - Python — PEP 517 wheel from GitHub release tag
  - Rust — cargo release build from GitHub release tag
  - Go — go build from GitHub release tag
  It then asks for GitHub URL, `pkgver`, `pkgdesc`, license, and binary name where needed; attempts checksum refresh with `updpkgsums`; and continues checks.
- `No, I will add it later.` — stops safely after repo setup.

By default it then runs plan checks and queues an agent GO/NO-GO review. With `--push`, it continues to publish after the plan passes and the user confirms.

It also writes a conservative `.gitignore` that ignores everything except common AUR package files.

## Expected workspace structure

Works from either:

```text
aur-packages/
  package-a/
    .git/
    PKGBUILD
    .SRCINFO
  package-b/
    .git/
    PKGBUILD
    .SRCINFO
```

or directly inside one AUR package clone:

```text
package-a/
  .git/
  PKGBUILD
  .SRCINFO
```

When multiple package directories are found, `/release-aur` prompts for a target or `all`.

## Recommended local tools

Minimum:

- `git`
- `makepkg` / `pacman`

Recommended:

- `namcap`
- `shellcheck`
- `devtools` (`pkgctl build`, `makerepropkg`)

Install on Arch-based systems as needed:

```bash
sudo pacman -S --needed base-devel git namcap shellcheck devtools pacman-contrib
```

## Arch guidance encoded

This workflow follows these ArchWiki rules/guidance:

- AUR write access requires an SSH key pair; the public key must be added to the AUR account profile and the private key configured for `aur.archlinux.org`.
- A dedicated AUR SSH key is preferred over reusing an existing key so it can be revoked independently.
- AUR uploads should be reviewed carefully before submission.
- New AUR package repositories are initialized by cloning `ssh://aur@aur.archlinux.org/<pkgbase>.git`.
- `.SRCINFO` must be regenerated when `PKGBUILD` metadata changes.
- At least `PKGBUILD` and `.SRCINFO` must be committed and pushed.
- AUR accepts pushes to `master`.
- Package testing should include `makepkg`, package content inspection, dependency review, and `namcap` sanity checks.
- Reproducibility can be checked with `makerepropkg`/`repro` when feasible.

## Install

From this workspace:

```bash
pi install ./pi-extension-release-aur
```

After publishing to npm:

```bash
pi install npm:@firstpick/pi-extension-release-aur
```
