#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="${PI_AUR_PACKAGES_ROOT:-$PWD}"
MODE="plan"
TARGET="auto"
PKGBASE=""
RUN_CHROOT=0
RUN_REPRO=0
STRICT_NAMCAP=1
KEEP_WORK=0
UPDATE_RELEASE=0
RELEASE_SOURCE="${PI_AUR_RELEASE_SOURCE:-auto}"
PACKAGE_RELEASE_SOURCES="${PI_AUR_PACKAGE_RELEASE_SOURCES:-}"

RESULT_LINES=()
TMP_DIRS=()

usage() {
  cat <<'EOF'
Usage:
  aur-release-workflow.sh --plan [--target <dir|all|auto>] [options]
  aur-release-workflow.sh --publish [--target <dir|all|auto>] [options]
  aur-release-workflow.sh --create --pkgbase <name>

Modes:
  --plan       Run deterministic AUR preflight checks in a temporary copy. With --update-release, may update PKGBUILD/.SRCINFO first.
  --publish    Re-run checks, regenerate .SRCINFO, commit, and push to AUR master.
  --create     Converge a target directory into an AUR package repository.
               Handles missing/empty dirs, existing git repos, and non-git dirs with PKGBUILD.

Options:
  --target <dir|all|auto>  Package directory target. auto = current dir if it has PKGBUILD, else all direct child dirs with PKGBUILD.
  --all                    Same as --target all.
  --pkgbase <name>         AUR pkgbase for --create.
  --chroot                 Also run pkgctl build in the temporary copy when pkgctl is available.
  --repro                  Also run makerepropkg on built package(s) when available.
  --update-release         Bump pkgver from configured upstream release source, reset pkgrel=1, run updpkgsums, and regenerate .SRCINFO before checks.
  --no-update-release      Disable release update check when the caller enables it by default.
  --release-source <src>   Upstream release source for all targets: auto, github:owner/repo, GitHub URL, git:<clone-url>, or git clone URL.
  --package-release-source <pkg=src>
                           Per-package source override. May be repeated; setup normally passes these via env.
  --keep-work              Keep temporary work directories for debugging.
  --no-strict-namcap       Do not fail on namcap E: findings.
  -h, --help               Show help.

Publish safety:
  - publish never runs unless the caller selected --publish explicitly.
  - publish regenerates .SRCINFO with makepkg --printsrcinfo.
  - publish stages PKGBUILD, .SRCINFO, tracked changes, and safe helper-file patterns only.
  - publish refuses obvious build artifacts such as src/, pkg/, *.pkg.tar.*, and *.src.tar.*.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --plan)
      MODE="plan"
      shift
      ;;
    --publish)
      MODE="publish"
      shift
      ;;
    --create)
      MODE="create"
      shift
      ;;
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --all)
      TARGET="all"
      shift
      ;;
    --pkgbase)
      PKGBASE="${2:-}"
      shift 2
      ;;
    --chroot)
      RUN_CHROOT=1
      shift
      ;;
    --repro)
      RUN_REPRO=1
      shift
      ;;
    --update-release)
      UPDATE_RELEASE=1
      shift
      ;;
    --no-update-release)
      UPDATE_RELEASE=0
      shift
      ;;
    --release-source)
      RELEASE_SOURCE="${2:-}"
      shift 2
      ;;
    --package-release-source)
      if [[ -n "$PACKAGE_RELEASE_SOURCES" ]]; then
        PACKAGE_RELEASE_SOURCES+=$'\n'
      fi
      PACKAGE_RELEASE_SOURCES+="${2:-}"
      shift 2
      ;;
    --keep-work)
      KEEP_WORK=1
      shift
      ;;
    --no-strict-namcap)
      STRICT_NAMCAP=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown option '$1'" >&2
      usage
      exit 1
      ;;
  esac
done

cleanup() {
  if [[ $KEEP_WORK -eq 1 ]]; then
    return
  fi
  local dir
  for dir in "${TMP_DIRS[@]}"; do
    [[ -n "$dir" && -d "$dir" ]] && rm -rf -- "$dir"
  done
}
trap cleanup EXIT

ok() { printf '\033[32mPASS\033[0m'; }
warn() { printf '\033[33mWARN\033[0m'; }
fail() { printf '\033[31mFAIL\033[0m'; }
info() { printf '\033[36m%s\033[0m' "$*"; }

run_cmd() {
  echo "+ $*"
  "$@"
}

run_bash() {
  local command="$1"
  echo "+ $command"
  bash -lc "$command"
}

require_command() {
  local command="$1"
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "ERROR: required command '$command' not found in PATH" >&2
    return 1
  fi
  return 0
}

srcinfo_get() {
  local file="$1"
  local key="$2"
  awk -F ' = ' -v key="$key" '
    {
      k=$1
      gsub(/^[ \t]+|[ \t]+$/, "", k)
      if (k == key) { print $2; exit }
    }
  ' "$file"
}

has_pkgbuild() {
  [[ -f "$1/PKGBUILD" ]]
}

resolve_targets() {
  local target="$1"
  if [[ "$target" == "auto" ]]; then
    if has_pkgbuild "$ROOT_DIR"; then
      printf '%s\n' "$ROOT_DIR"
      return 0
    fi
    target="all"
  fi

  if [[ "$target" == "all" ]]; then
    find "$ROOT_DIR" -mindepth 2 -maxdepth 2 -type f -name PKGBUILD -printf '%h\n' | sort
    return 0
  fi

  if [[ "$target" == "." ]]; then
    if has_pkgbuild "$ROOT_DIR"; then
      printf '%s\n' "$ROOT_DIR"
      return 0
    fi
    echo "ERROR: current root '$ROOT_DIR' does not contain PKGBUILD" >&2
    return 1
  fi

  if [[ -d "$ROOT_DIR/$target" && -f "$ROOT_DIR/$target/PKGBUILD" ]]; then
    printf '%s\n' "$ROOT_DIR/$target"
    return 0
  fi

  if [[ -d "$target" && -f "$target/PKGBUILD" ]]; then
    (cd "$target" && pwd)
    return 0
  fi

  echo "ERROR: target '$target' does not resolve to a directory with PKGBUILD under $ROOT_DIR" >&2
  return 1
}

copy_package_to_tmp() {
  local pkg_dir="$1"
  local tmp
  tmp="$(mktemp -d -t release-aur.XXXXXX)"
  TMP_DIRS+=("$tmp")

  shopt -s dotglob nullglob
  local item base
  for item in "$pkg_dir"/*; do
    base="$(basename "$item")"
    case "$base" in
      .git|src|pkg|*.pkg.tar.*|*.src.tar.*|*.log|*.tmp|*.bak|*.old)
        continue
        ;;
    esac
    cp -a -- "$item" "$tmp/"
  done
  shopt -u dotglob nullglob

  printf '%s\n' "$tmp"
}

aur_remote_name() {
  local pkg_dir="$1"
  git -C "$pkg_dir" remote -v 2>/dev/null | awk '/aur\.archlinux\.org/ { print $1; exit }'
}

is_forbidden_artifact() {
  local path="$1"
  case "$path" in
    src|src/*|pkg|pkg/*|*.pkg.tar.*|*.src.tar.*|*.log|*.tmp|*.bak|*.old|*~)
      return 0
      ;;
  esac
  return 1
}

is_safe_untracked_helper() {
  local path="$1"
  case "$path" in
    PKGBUILD|.SRCINFO|.gitignore|*.install|*.patch|*.diff|*.service|*.sysusers|*.tmpfiles|*.hook|*.desktop|*.conf|*.sh|*.py|*.pl|LICENSE|LICENSE.*|*.license)
      return 0
      ;;
  esac
  return 1
}

package_version_label() {
  local srcinfo="$1"
  local pkgver pkgrel epoch
  pkgver="$(srcinfo_get "$srcinfo" pkgver)"
  pkgrel="$(srcinfo_get "$srcinfo" pkgrel)"
  epoch="$(srcinfo_get "$srcinfo" epoch)"
  if [[ -n "$epoch" ]]; then
    printf '%s:%s-%s' "$epoch" "${pkgver:-unknown}" "${pkgrel:-unknown}"
  else
    printf '%s-%s' "${pkgver:-unknown}" "${pkgrel:-unknown}"
  fi
}

pkgbuild_value() {
  local pkgbuild="$1"
  local key="$2"
  awk -F= -v key="$key" '
    $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
      value=$0
      sub(/^[^=]*=/, "", value)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^['\''"]|['\''"]$/, "", value)
      print value
      exit
    }
  ' "$pkgbuild"
}

github_repo_from_text() {
  local text="$1"
  local match repo
  match="$(printf '%s\n' "$text" | grep -Eio 'github\.com[:/][A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+' | head -n 1 || true)"
  [[ -z "$match" ]] && return 1
  repo="${match#github.com/}"
  repo="${repo#github.com:}"
  repo="${repo%.git}"
  [[ "$repo" == */* ]] || return 1
  printf '%s\n' "$repo"
}

github_repo_from_pkgbuild() {
  local pkgbuild="$1"
  github_repo_from_text "$(cat "$pkgbuild")"
}

github_repo_from_source_spec() {
  local source="$1"
  local raw repo
  raw="${source#github:}"
  raw="${raw#//}"
  raw="${raw%.git}"
  raw="${raw%/}"
  if [[ "$raw" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
    printf '%s\n' "$raw"
    return 0
  fi
  github_repo_from_text "$source"
}

git_url_from_source_spec() {
  local source="$1"
  case "$source" in
    git+*)
      printf '%s\n' "${source#git+}"
      ;;
    git:*)
      printf '%s\n' "${source#git:}"
      ;;
    http://*|https://*|ssh://*|git@*|file://*)
      printf '%s\n' "$source"
      ;;
    *)
      return 1
      ;;
  esac
}

normalize_release_tag() {
  local tag="$1"
  tag="${tag#refs/tags/}"
  tag="${tag#v}"
  tag="${tag#V}"
  tag="${tag//-/_}"
  printf '%s\n' "$tag"
}

latest_git_release_tag() {
  local url="$1"
  local tag
  if ! command -v git >/dev/null 2>&1; then
    return 1
  fi
  tag="$(git ls-remote --tags --refs "$url" 2>/dev/null | awk -F/ '{print $NF}' | sort -V | tail -n 1 || true)"
  if [[ -n "$tag" ]]; then
    printf '%s\n' "$tag"
    return 0
  fi
  return 1
}

latest_github_release_tag() {
  local repo="$1"
  local api tag
  if command -v curl >/dev/null 2>&1; then
    api="https://api.github.com/repos/${repo}/releases/latest"
    tag="$(curl -fsSL -H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2022-11-28' "$api" 2>/dev/null | sed -nE 's/.*"tag_name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' | head -n 1 || true)"
    if [[ -n "$tag" ]]; then
      printf '%s\n' "$tag"
      return 0
    fi
  fi

  latest_git_release_tag "https://github.com/${repo}.git"
}

release_source_for_package() {
  local pkg_dir="$1"
  local pkgbuild="$pkg_dir/PKGBUILD"
  local display pkgbase line key value tab
  display="$(basename "$pkg_dir")"
  pkgbase="$(pkgbuild_value "$pkgbuild" pkgbase 2>/dev/null || true)"
  if [[ -z "$pkgbase" ]]; then
    pkgbase="$(pkgbuild_value "$pkgbuild" pkgname 2>/dev/null || true)"
  fi
  tab=$'\t'

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if [[ "$line" == *"$tab"* ]]; then
      key="${line%%"$tab"*}"
      value="${line#*"$tab"}"
    elif [[ "$line" == *=* ]]; then
      key="${line%%=*}"
      value="${line#*=}"
    else
      continue
    fi
    if [[ "$key" == "$display" || ( -n "$pkgbase" && "$key" == "$pkgbase" ) ]]; then
      printf '%s\n' "$value"
      return 0
    fi
  done <<< "$PACKAGE_RELEASE_SOURCES"

  printf '%s\n' "${RELEASE_SOURCE:-auto}"
}

set_pkgbuild_version_and_rel() {
  local pkgbuild="$1"
  local version="$2"
  local tmp
  tmp="$(mktemp)"
  awk -v version="$version" '
    BEGIN { pkgver_done=0; pkgrel_done=0 }
    /^[[:space:]]*pkgver[[:space:]]*=/ && pkgver_done == 0 { print "pkgver=" version; pkgver_done=1; next }
    /^[[:space:]]*pkgrel[[:space:]]*=/ && pkgrel_done == 0 { print "pkgrel=1"; pkgrel_done=1; next }
    { print }
    END {
      if (pkgver_done == 0) exit 2
      if (pkgrel_done == 0) exit 3
    }
  ' "$pkgbuild" > "$tmp"
  local status=$?
  if [[ $status -ne 0 ]]; then
    rm -f -- "$tmp"
    return $status
  fi
  mv -- "$tmp" "$pkgbuild"
}

update_release_if_needed() {
  local pkg_dir="$1"
  local display pkgbuild source repo git_url source_label current tag latest cmp
  display="$(basename "$pkg_dir")"
  pkgbuild="$pkg_dir/PKGBUILD"

  echo "$(info '==>') Upstream release check $display"
  if [[ ! -f "$pkgbuild" ]]; then
    echo "  - [$(warn)] PKGBUILD missing; skipping release update check"
    return 0
  fi

  source="$(release_source_for_package "$pkg_dir")"
  source="${source:-auto}"
  echo "  - release source: $source"

  if [[ "$source" == "auto" || "$source" == "github:auto" ]]; then
    repo="$(github_repo_from_pkgbuild "$pkgbuild" || true)"
    if [[ -z "$repo" ]]; then
      echo "  - [$(warn)] release source is auto but no github.com repository URL was detected in PKGBUILD; skipping release update check"
      return 0
    fi
    echo "  - GitHub repo: $repo"
    tag="$(latest_github_release_tag "$repo" || true)"
    source_label="latest GitHub release"
  else
    repo="$(github_repo_from_source_spec "$source" || true)"
    if [[ -n "$repo" ]]; then
      echo "  - GitHub repo: $repo (configured)"
      tag="$(latest_github_release_tag "$repo" || true)"
      source_label="latest GitHub release"
    else
      git_url="$(git_url_from_source_spec "$source" || true)"
      if [[ -z "$git_url" ]]; then
        echo "  - [$(warn)] unsupported release source '$source'; use auto, github:owner/repo, a GitHub URL, git:<clone-url>, or a git clone URL"
        return 0
      fi
      echo "  - git tag source: $git_url"
      tag="$(latest_git_release_tag "$git_url" || true)"
      source_label="latest git tag"
    fi
  fi

  current="$(pkgbuild_value "$pkgbuild" pkgver)"
  if [[ -z "$current" ]]; then
    echo "  - [$(fail)] could not read pkgver from PKGBUILD"
    return 1
  fi
  echo "  - current pkgver: $current"

  if [[ -z "$tag" ]]; then
    echo "  - [$(warn)] could not determine $source_label; skipping release update check"
    return 0
  fi
  latest="$(normalize_release_tag "$tag")"
  echo "  - $source_label: $tag -> pkgver $latest"

  if ! command -v vercmp >/dev/null 2>&1; then
    echo "  - [$(fail)] vercmp not installed; cannot compare versions safely"
    return 1
  fi

  cmp="$(vercmp "$latest" "$current")"
  if [[ "$cmp" -le 0 ]]; then
    echo "  - [$(ok)] pkgver is current or newer; no bump needed"
    return 0
  fi

  if ! command -v updpkgsums >/dev/null 2>&1; then
    echo "  - [$(fail)] updpkgsums not installed; cannot update checksum arrays"
    return 1
  fi

  local backup_pkgbuild backup_srcinfo had_srcinfo
  backup_pkgbuild="$(mktemp)"
  backup_srcinfo="$(mktemp)"
  had_srcinfo=0
  cp -- "$pkgbuild" "$backup_pkgbuild"
  if [[ -f "$pkg_dir/.SRCINFO" ]]; then
    cp -- "$pkg_dir/.SRCINFO" "$backup_srcinfo"
    had_srcinfo=1
  fi
  restore_update_backup() {
    cp -- "$backup_pkgbuild" "$pkgbuild"
    if [[ $had_srcinfo -eq 1 ]]; then
      cp -- "$backup_srcinfo" "$pkg_dir/.SRCINFO"
    else
      rm -f -- "$pkg_dir/.SRCINFO"
    fi
    rm -f -- "$backup_pkgbuild" "$backup_srcinfo"
  }

  if ! set_pkgbuild_version_and_rel "$pkgbuild" "$latest"; then
    echo "  - [$(fail)] could not update pkgver/pkgrel in PKGBUILD"
    restore_update_backup
    return 1
  fi
  echo "  - [$(ok)] bumped pkgver $current -> $latest and reset pkgrel=1"

  echo "+ updpkgsums"
  if ! (cd "$pkg_dir" && updpkgsums); then
    echo "  - [$(fail)] updpkgsums failed after pkgver bump; restored PKGBUILD/.SRCINFO"
    restore_update_backup
    return 1
  fi
  echo "  - [$(ok)] updated checksum arrays"

  echo "+ makepkg --printsrcinfo > .SRCINFO"
  if ! (cd "$pkg_dir" && makepkg --printsrcinfo > .SRCINFO); then
    echo "  - [$(fail)] failed to regenerate .SRCINFO after pkgver bump; restored PKGBUILD/.SRCINFO"
    restore_update_backup
    return 1
  fi
  echo "  - [$(ok)] regenerated .SRCINFO"
  rm -f -- "$backup_pkgbuild" "$backup_srcinfo"
  return 0
}

LAST_PKGBASE=""
LAST_VERSION=""
LAST_SRCINFO_STATUS="unknown"
LAST_BUILD_STATUS="unknown"
LAST_NAMCAP_STATUS="unknown"
LAST_ACTION="unknown"

check_one() {
  local pkg_dir="$1"
  local display
  display="$(basename "$pkg_dir")"
  local pkg_fail=0
  local srcinfo_status="unknown"
  local build_status="not-run"
  local namcap_status="skipped"
  local pkgbase="unknown"
  local version="unknown"

  echo "$(info '==>') $display"
  echo "Directory: $pkg_dir"

  if [[ ! -f "$pkg_dir/PKGBUILD" ]]; then
    echo "  - [$(fail)] PKGBUILD missing"
    RESULT_LINES+=("  - $display -> blocked (missing PKGBUILD)")
    return 1
  fi
  echo "  - [$(ok)] PKGBUILD exists"

  if git -C "$pkg_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "  - [$(ok)] git repository detected"
    local remote branch status_lines git_name git_email
    remote="$(aur_remote_name "$pkg_dir")"
    branch="$(git -C "$pkg_dir" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
    git_name="$(git -C "$pkg_dir" config user.name 2>/dev/null || git config --global user.name 2>/dev/null || true)"
    git_email="$(git -C "$pkg_dir" config user.email 2>/dev/null || git config --global user.email 2>/dev/null || true)"
    echo "  - git branch: ${branch:-unknown}"
    echo "  - git author: ${git_name:-<unset>} <${git_email:-unset}>"
    if [[ -n "$remote" ]]; then
      echo "  - [$(ok)] AUR remote detected: $remote ($(git -C "$pkg_dir" remote get-url "$remote" 2>/dev/null || true))"
    else
      echo "  - [$(fail)] no git remote containing aur.archlinux.org"
      pkg_fail=1
    fi
    status_lines="$(git -C "$pkg_dir" status --porcelain=v1 2>/dev/null || true)"
    if [[ -n "$status_lines" ]]; then
      echo "  - [$(warn)] working tree has changes for review:"
      printf '%s\n' "$status_lines" | sed 's/^/      /'
    else
      echo "  - [$(ok)] working tree is clean"
    fi
  else
    echo "  - [$(fail)] not a git repository; use --create or initialize an AUR remote first"
    pkg_fail=1
  fi

  local tmp
  tmp="$(copy_package_to_tmp "$pkg_dir")"
  echo "  - temporary build copy: $tmp"
  if [[ $KEEP_WORK -eq 1 ]]; then
    echo "  - [$(warn)] keeping temporary work directory because --keep-work was set"
  fi

  export LANG=C.UTF-8
  export LC_ALL=C.UTF-8
  export TZ=UTC
  export MAKEPKG_COLOR=never

  if (cd "$tmp" && run_bash 'makepkg --printsrcinfo > .SRCINFO.generated'); then
    echo "  - [$(ok)] makepkg --printsrcinfo succeeds"
    pkgbase="$(srcinfo_get "$tmp/.SRCINFO.generated" pkgbase)"
    version="$(package_version_label "$tmp/.SRCINFO.generated")"
    echo "  - pkgbase: ${pkgbase:-unknown}"
    echo "  - version: $version"

    if [[ -f "$pkg_dir/.SRCINFO" ]]; then
      if diff -u -- "$pkg_dir/.SRCINFO" "$tmp/.SRCINFO.generated" >/dev/null; then
        srcinfo_status="ok"
        echo "  - [$(ok)] .SRCINFO is in sync with PKGBUILD"
      else
        srcinfo_status="stale"
        echo "  - [$(warn)] .SRCINFO differs from makepkg --printsrcinfo output"
        diff -u -- "$pkg_dir/.SRCINFO" "$tmp/.SRCINFO.generated" | sed -n '1,120p' | sed 's/^/      /'
      fi
    else
      srcinfo_status="missing"
      echo "  - [$(warn)] .SRCINFO missing; publish mode will generate it"
    fi
  else
    echo "  - [$(fail)] makepkg --printsrcinfo failed"
    pkg_fail=1
  fi

  if (cd "$tmp" && run_cmd makepkg --verifysource --noconfirm); then
    echo "  - [$(ok)] makepkg --verifysource succeeds"
  else
    echo "  - [$(fail)] makepkg --verifysource failed"
    pkg_fail=1
  fi

  if (cd "$tmp" && run_cmd makepkg --clean --cleanbuild --force --noconfirm); then
    build_status="pass"
    echo "  - [$(ok)] makepkg build/check/package succeeds"
  else
    build_status="fail"
    echo "  - [$(fail)] makepkg build/check/package failed"
    pkg_fail=1
  fi

  local pkg_files=()
  mapfile -t pkg_files < <(find "$tmp" -maxdepth 1 -type f -name '*.pkg.tar.*' ! -name '*.sig' | sort)
  if [[ ${#pkg_files[@]} -gt 0 ]]; then
    echo "  - [$(ok)] built package artifact(s):"
    local pkg file_count
    for pkg in "${pkg_files[@]}"; do
      echo "      - $(basename "$pkg")"
      if command -v pacman >/dev/null 2>&1; then
        file_count="$(pacman -Qlp "$pkg" 2>/dev/null | wc -l | tr -d ' ')"
        echo "        files: ${file_count:-unknown}"
        pacman -Qip "$pkg" 2>/dev/null | sed -n '1,40p' | sed 's/^/        /' || true
      fi
    done
  else
    echo "  - [$(fail)] no built package artifact found"
    pkg_fail=1
  fi

  if command -v namcap >/dev/null 2>&1; then
    echo "+ namcap PKGBUILD and built package(s)"
    local namcap_output namcap_exit
    namcap_exit=0
    namcap_output="$(cd "$tmp" && namcap PKGBUILD "${pkg_files[@]}" 2>&1)" || namcap_exit=$?
    if [[ -n "$namcap_output" ]]; then
      printf '%s\n' "$namcap_output" | sed 's/^/    /'
    fi
    if printf '%s\n' "$namcap_output" | grep -qE '(^|[[:space:]])E:'; then
      namcap_status="fail"
      if [[ $STRICT_NAMCAP -eq 1 ]]; then
        echo "  - [$(fail)] namcap reported E: findings"
        pkg_fail=1
      else
        namcap_status="fail-allowed"
        echo "  - [$(warn)] namcap reported E: findings but --no-strict-namcap is set"
      fi
    elif [[ $namcap_exit -ne 0 ]]; then
      namcap_status="warn"
      echo "  - [$(warn)] namcap exited with status $namcap_exit"
    elif [[ -n "$namcap_output" ]]; then
      namcap_status="warn"
      echo "  - [$(warn)] namcap reported warnings/info; review above"
    else
      namcap_status="pass"
      echo "  - [$(ok)] namcap produced no findings"
    fi
  else
    echo "  - [$(warn)] namcap not installed; install namcap for package sanity checks"
  fi

  if command -v shellcheck >/dev/null 2>&1; then
    if shellcheck -s bash -e SC2034,SC2154 "$tmp/PKGBUILD" >/tmp/release-aur-shellcheck.$$ 2>&1; then
      echo "  - [$(ok)] shellcheck PKGBUILD passes (PKGBUILD variable false positives suppressed)"
    else
      echo "  - [$(warn)] shellcheck reported findings (review; not fatal by default)"
      sed -n '1,120p' /tmp/release-aur-shellcheck.$$ | sed 's/^/      /'
    fi
    rm -f /tmp/release-aur-shellcheck.$$
  else
    echo "  - [$(warn)] shellcheck not installed; skipping shell lint"
  fi

  if [[ $RUN_CHROOT -eq 1 ]]; then
    if command -v pkgctl >/dev/null 2>&1; then
      if (cd "$tmp" && run_cmd pkgctl build); then
        echo "  - [$(ok)] pkgctl clean-chroot build succeeds"
      else
        echo "  - [$(fail)] pkgctl clean-chroot build failed"
        pkg_fail=1
      fi
    else
      echo "  - [$(fail)] --chroot requested but pkgctl is not installed (devtools)"
      pkg_fail=1
    fi
  else
    echo "  - [$(warn)] clean chroot build skipped (pass --chroot to enable pkgctl build)"
  fi

  if [[ $RUN_REPRO -eq 1 ]]; then
    if command -v makerepropkg >/dev/null 2>&1; then
      local repro_fail=0
      local pkg
      for pkg in "${pkg_files[@]}"; do
        if run_cmd makerepropkg "$pkg"; then
          echo "  - [$(ok)] makerepropkg succeeds for $(basename "$pkg")"
        else
          echo "  - [$(fail)] makerepropkg failed for $(basename "$pkg")"
          repro_fail=1
        fi
      done
      if [[ $repro_fail -ne 0 ]]; then
        pkg_fail=1
      fi
    else
      echo "  - [$(fail)] --repro requested but makerepropkg is not installed (devtools)"
      pkg_fail=1
    fi
  else
    echo "  - [$(warn)] reproducibility check skipped (pass --repro to enable makerepropkg)"
  fi

  LAST_PKGBASE="${pkgbase:-unknown}"
  LAST_VERSION="$version"
  LAST_SRCINFO_STATUS="$srcinfo_status"
  LAST_BUILD_STATUS="$build_status"
  LAST_NAMCAP_STATUS="$namcap_status"

  if [[ $pkg_fail -eq 0 ]]; then
    LAST_ACTION="ready"
    RESULT_LINES+=("  - $display -> ready (pkgbase=${LAST_PKGBASE} version=${LAST_VERSION} srcinfo=${srcinfo_status} build=${build_status} namcap=${namcap_status})")
    echo "  Result: $(ok) ready for reviewed publish"
    echo
    return 0
  fi

  LAST_ACTION="blocked"
  RESULT_LINES+=("  - $display -> blocked (pkgbase=${LAST_PKGBASE} version=${LAST_VERSION} srcinfo=${srcinfo_status} build=${build_status} namcap=${namcap_status})")
  echo "  Result: $(fail) blocked"
  echo
  return 1
}

stage_safe_changes() {
  local pkg_dir="$1"
  local unsafe=()
  local line path

  (cd "$pkg_dir" && git add -- PKGBUILD .SRCINFO)
  (cd "$pkg_dir" && git add -u -- .)

  while IFS= read -r line; do
    [[ "${line:0:2}" == "??" ]] || continue
    path="${line:3}"
    if is_forbidden_artifact "$path"; then
      unsafe+=("$path")
      continue
    fi
    if is_safe_untracked_helper "$path"; then
      (cd "$pkg_dir" && git add -- "$path")
      continue
    fi
    unsafe+=("$path")
  done < <(cd "$pkg_dir" && git status --porcelain=v1)

  if [[ ${#unsafe[@]} -gt 0 ]]; then
    echo "ERROR: refusing to auto-stage untracked or forbidden files:" >&2
    printf '  - %s\n' "${unsafe[@]}" >&2
    echo "Stage intended helper files manually, add ignore rules for artifacts, then rerun." >&2
    return 1
  fi

  local staged=()
  mapfile -t staged < <(cd "$pkg_dir" && git diff --cached --name-only)
  for path in "${staged[@]}"; do
    if is_forbidden_artifact "$path"; then
      echo "ERROR: forbidden build artifact is staged: $path" >&2
      return 1
    fi
  done

  return 0
}

publish_one() {
  local pkg_dir="$1"
  local display remote message has_head
  display="$(basename "$pkg_dir")"

  if ! check_one "$pkg_dir"; then
    echo "Publish preflight blocked for $display; not committing or pushing." >&2
    return 1
  fi

  remote="$(aur_remote_name "$pkg_dir")"
  if [[ -z "$remote" ]]; then
    echo "ERROR: no AUR remote found for $display" >&2
    return 1
  fi

  echo "$(info '==>') Publishing $display"
  echo "+ git fetch $remote master"
  if ! git -C "$pkg_dir" fetch "$remote" master; then
    echo "  - [$(warn)] git fetch failed; continuing only if this is an empty/new AUR repository"
  fi
  if git -C "$pkg_dir" rev-parse --verify --quiet "$remote/master" >/dev/null; then
    if ! git -C "$pkg_dir" merge-base --is-ancestor "$remote/master" HEAD; then
      echo "ERROR: local HEAD does not contain $remote/master; pull/rebase before publishing." >&2
      return 1
    fi
  fi

  echo "+ makepkg --printsrcinfo > .SRCINFO"
  if ! (cd "$pkg_dir" && makepkg --printsrcinfo > .SRCINFO); then
    echo "ERROR: failed to regenerate .SRCINFO in $pkg_dir" >&2
    return 1
  fi

  if ! stage_safe_changes "$pkg_dir"; then
    return 1
  fi

  if git -C "$pkg_dir" diff --cached --quiet; then
    echo "  - [$(warn)] no staged changes after .SRCINFO regeneration; skipping commit and push for $display"
    return 0
  fi

  echo "+ git diff --cached --check"
  if ! git -C "$pkg_dir" diff --cached --check; then
    echo "ERROR: staged diff failed git whitespace/error check" >&2
    return 1
  fi

  echo "Staged files:"
  git -C "$pkg_dir" diff --cached --name-status | sed 's/^/  /'

  if git -C "$pkg_dir" rev-parse --verify HEAD >/dev/null 2>&1; then
    has_head=1
  else
    has_head=0
  fi

  if [[ $has_head -eq 0 ]]; then
    message="Initial import"
  else
    message="Update ${LAST_PKGBASE} to ${LAST_VERSION}"
  fi

  echo "+ git commit -m '$message'"
  if ! git -C "$pkg_dir" commit -m "$message"; then
    echo "ERROR: git commit failed" >&2
    return 1
  fi

  echo "+ git push $remote HEAD:master"
  if ! git -C "$pkg_dir" push "$remote" HEAD:master; then
    echo "ERROR: git push to AUR failed" >&2
    return 1
  fi

  echo "  Result: $(ok) pushed $display to AUR master"
  return 0
}

write_conservative_gitignore() {
  local dest="$1"
  if [[ -f "$dest/.gitignore" ]]; then
    return 0
  fi

  cat > "$dest/.gitignore" <<'EOF'
*
!.gitignore
!PKGBUILD
!.SRCINFO
!*.install
!*.patch
!*.diff
!*.service
!*.sysusers
!*.tmpfiles
!*.hook
!*.desktop
!*.conf
!*.sh
!*.py
!*.pl
!LICENSE
!LICENSE.*
EOF
  echo "  - wrote conservative .gitignore; force-add unusual helper/source files intentionally"
}

is_empty_dir() {
  local dir="$1"
  [[ -d "$dir" ]] || return 1
  [[ -z "$(find "$dir" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]
}

safe_package_file_for_adoption() {
  local path="$1"
  case "$path" in
    PKGBUILD|.SRCINFO|.gitignore|*.install|*.patch|*.diff|*.service|*.sysusers|*.tmpfiles|*.hook|*.desktop|*.conf|*.sh|*.py|*.pl|LICENSE|LICENSE.*|*.license)
      return 0
      ;;
  esac
  return 1
}

copy_adopted_package_files() {
  local source_dir="$1"
  local dest="$2"
  local copied=0
  local skipped=()
  local conflicts=()
  local item rel

  shopt -s dotglob nullglob
  for item in "$source_dir"/*; do
    rel="$(basename "$item")"
    case "$rel" in
      .git|src|pkg|*.pkg.tar.*|*.src.tar.*|*.log|*.tmp|*.bak|*.old|*~)
        skipped+=("$rel")
        continue
        ;;
    esac

    if ! safe_package_file_for_adoption "$rel"; then
      skipped+=("$rel")
      continue
    fi

    if [[ -e "$dest/$rel" ]] && ! cmp -s "$item" "$dest/$rel"; then
      conflicts+=("$rel")
      continue
    fi

    cp -a -- "$item" "$dest/$rel"
    copied=$((copied + 1))
  done
  shopt -u dotglob nullglob

  if [[ ${#conflicts[@]} -gt 0 ]]; then
    echo "ERROR: AUR clone already has conflicting package file(s); merge manually:" >&2
    printf '  - %s\n' "${conflicts[@]}" >&2
    echo "Your original files remain in: $source_dir" >&2
    return 1
  fi

  echo "  - adopted safe package files: $copied"
  if [[ ${#skipped[@]} -gt 0 ]]; then
    echo "  - skipped non-standard/advisory files; copy intentionally if needed:"
    printf '      - %s\n' "${skipped[@]}"
  fi
}

ensure_aur_remote() {
  local dest="$1"
  local pkgbase="$2"
  local remote
  remote="$(aur_remote_name "$dest")"
  if [[ -n "$remote" ]]; then
    echo "  - AUR remote already configured: $remote ($(git -C "$dest" remote get-url "$remote" 2>/dev/null || true))"
    return 0
  fi

  local remote_name="aur"
  if git -C "$dest" remote get-url "$remote_name" >/dev/null 2>&1; then
    remote_name="aur-origin"
  fi
  echo "+ git remote add $remote_name ssh://aur@aur.archlinux.org/${pkgbase}.git"
  git -C "$dest" remote add "$remote_name" "ssh://aur@aur.archlinux.org/${pkgbase}.git"
  echo "+ git fetch $remote_name master"
  git -C "$dest" fetch "$remote_name" master || echo "  - [$(warn)] fetch failed; expected for a new empty AUR package"
}

clone_aur_repo() {
  local dest="$1"
  local pkgbase="$2"
  echo "+ git -c init.defaultBranch=master clone ssh://aur@aur.archlinux.org/${pkgbase}.git $dest"
  git -c init.defaultBranch=master clone "ssh://aur@aur.archlinux.org/${pkgbase}.git" "$dest"
}

generate_srcinfo_if_possible() {
  local dest="$1"
  if [[ ! -f "$dest/PKGBUILD" ]]; then
    echo "  - [$(warn)] no PKGBUILD yet; create/adoption done, but plan/publish cannot continue until PKGBUILD exists"
    return 2
  fi

  echo "+ makepkg --printsrcinfo > .SRCINFO"
  if (cd "$dest" && makepkg --printsrcinfo > .SRCINFO); then
    echo "  - [$(ok)] generated .SRCINFO"
    return 0
  fi

  echo "ERROR: makepkg --printsrcinfo failed in $dest" >&2
  return 1
}

create_repo() {
  if [[ -z "$PKGBASE" ]]; then
    echo "ERROR: --create requires --pkgbase <name>" >&2
    return 1
  fi
  if [[ ! "$PKGBASE" =~ ^[a-z0-9][a-z0-9@._+-]*$ ]]; then
    echo "ERROR: pkgbase '$PKGBASE' contains unexpected characters" >&2
    return 1
  fi

  local dest="$ROOT_DIR/$PKGBASE"
  local timestamp staging
  timestamp="$(date -u +%Y%m%d-%H%M%S)"
  mkdir -p "$ROOT_DIR"

  echo "AUR create/converge"
  echo "pkgbase=$PKGBASE"
  echo "dest=$dest"

  if [[ ! -e "$dest" ]]; then
    clone_aur_repo "$dest" "$PKGBASE" || { echo "ERROR: AUR clone/init failed" >&2; return 1; }
    write_conservative_gitignore "$dest"
    generate_srcinfo_if_possible "$dest" || true
    echo "Created AUR package repo: $dest"
    return 0
  fi

  if is_empty_dir "$dest"; then
    rmdir "$dest"
    clone_aur_repo "$dest" "$PKGBASE" || { echo "ERROR: AUR clone/init failed" >&2; return 1; }
    write_conservative_gitignore "$dest"
    generate_srcinfo_if_possible "$dest" || true
    echo "Created AUR package repo in previously empty directory: $dest"
    return 0
  fi

  if git -C "$dest" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "  - existing git repository detected"
    ensure_aur_remote "$dest" "$PKGBASE" || return 1
    write_conservative_gitignore "$dest"
    local srcinfo_status=0
    generate_srcinfo_if_possible "$dest" || srcinfo_status=$?
    if [[ $srcinfo_status -eq 1 ]]; then
      return 1
    fi
    echo "Converged existing git repository for AUR: $dest"
    return 0
  fi

  if [[ -f "$dest/PKGBUILD" ]]; then
    staging="${dest}.pkgbuild-staging.${timestamp}"
    if [[ -e "$staging" ]]; then
      echo "ERROR: staging path already exists: $staging" >&2
      return 1
    fi
    echo "+ mv $dest $staging"
    mv -- "$dest" "$staging"
    echo "+ git clone AUR repo into original destination"
    if ! clone_aur_repo "$dest" "$PKGBASE"; then
      echo "ERROR: AUR clone failed; restoring original directory" >&2
      rm -rf -- "$dest"
      mv -- "$staging" "$dest"
      return 1
    fi
    write_conservative_gitignore "$dest"
    copy_adopted_package_files "$staging" "$dest" || return 1
    generate_srcinfo_if_possible "$dest" || return $?
    echo "Adopted existing PKGBUILD directory into AUR git repo: $dest"
    echo "Original directory kept as staging backup: $staging"
    return 0
  fi

  echo "ERROR: destination exists but is neither empty, git repo, nor a PKGBUILD directory: $dest" >&2
  echo "Refusing to infer package files. Move unrelated content aside or add PKGBUILD first." >&2
  return 1
}

main() {
  require_command git || exit 1

  if [[ "$MODE" == "create" ]]; then
    create_repo
    exit $?
  fi

  require_command makepkg || exit 1

  local targets=()
  mapfile -t targets < <(resolve_targets "$TARGET")
  if [[ ${#targets[@]} -eq 0 ]]; then
    echo "ERROR: no package targets found under $ROOT_DIR" >&2
    exit 1
  fi

  echo "AUR release workflow"
  echo "mode=$MODE"
  echo "root=$ROOT_DIR"
  echo "target=$TARGET"
  echo "targets=${#targets[@]}"
  echo "chroot=$RUN_CHROOT repro=$RUN_REPRO strict_namcap=$STRICT_NAMCAP update_release=$UPDATE_RELEASE release_source=${RELEASE_SOURCE:-auto}"
  echo

  local failures=0
  local target_dir
  if [[ $UPDATE_RELEASE -eq 1 ]]; then
    for target_dir in "${targets[@]}"; do
      update_release_if_needed "$target_dir" || failures=$((failures + 1))
    done
    echo
  fi

  if [[ "$MODE" == "plan" ]]; then
    for target_dir in "${targets[@]}"; do
      check_one "$target_dir" || failures=$((failures + 1))
    done
  elif [[ "$MODE" == "publish" ]]; then
    for target_dir in "${targets[@]}"; do
      publish_one "$target_dir" || failures=$((failures + 1))
    done
  else
    echo "ERROR: unsupported mode '$MODE'" >&2
    exit 1
  fi

  echo "AUR release summary:"
  printf '%s\n' "${RESULT_LINES[@]}"

  if [[ $failures -gt 0 ]]; then
    echo "Final result: $(fail) $failures target(s) blocked or failed"
    exit 1
  fi

  echo "Final result: $(ok) all target(s) completed mode=$MODE"
}

main
