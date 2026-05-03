#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_EXT_DIR="${DOTFILES_EXT_DIR:-$HOME/.dotfiles/.pi/agent/extensions}"
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage:
  sync-dotfiles-extension-symlinks.sh [--dry-run]

Ensures every pi-extension-* package in npm-packages has a matching
~/.dotfiles/.pi/agent/extensions/<name>.ts symlink to its canonical
npm-packages/pi-extension-<name>/index.ts file.

If a non-symlink file already exists at the destination, it is renamed to:
  <file>.hardcoded.<timestamp>.bak
then replaced with the canonical symlink.

Options:
  --dry-run   Show planned actions without changing files
  -h, --help  Show this help

Env:
  DOTFILES_EXT_DIR   Override dotfiles extensions directory
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
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

if [[ ! -d "$ROOT_DIR" ]]; then
  echo "ERROR: root dir not found: $ROOT_DIR" >&2
  exit 1
fi

mkdir -p "$DOTFILES_EXT_DIR"

ts_now() {
  date +"%Y%m%d-%H%M%S"
}

backup_path() {
  local path="$1"
  local stamp="$2"
  local candidate="${path}.hardcoded.${stamp}.bak"
  local i=1
  while [[ -e "$candidate" || -L "$candidate" ]]; do
    candidate="${path}.hardcoded.${stamp}.bak.${i}"
    i=$((i+1))
  done
  printf '%s' "$candidate"
}

realpath_safe() {
  readlink -f "$1" 2>/dev/null || true
}

run_cmd() {
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "DRY-RUN: $*"
  else
    "$@"
  fi
}

count_total=0
count_ok=0
count_linked=0
count_relinked=0
count_renamed=0
count_skipped=0

shopt -s nullglob
for pkg_dir in "$ROOT_DIR"/pi-extension-*; do
  [[ -d "$pkg_dir" ]] || continue
  [[ -f "$pkg_dir/package.json" ]] || continue

  count_total=$((count_total+1))

  pkg_name="$(basename "$pkg_dir")"
  ext_name="${pkg_name#pi-extension-}"
  canonical="$pkg_dir/index.ts"
  dest="$DOTFILES_EXT_DIR/${ext_name}.ts"

  if [[ ! -f "$canonical" ]]; then
    echo "SKIP  $pkg_name -> missing canonical file: $canonical"
    count_skipped=$((count_skipped+1))
    continue
  fi

  canonical_real="$(realpath_safe "$canonical")"
  if [[ -z "$canonical_real" ]]; then
    echo "SKIP  $pkg_name -> cannot resolve canonical realpath: $canonical"
    count_skipped=$((count_skipped+1))
    continue
  fi

  if [[ -L "$dest" ]]; then
    dest_real="$(realpath_safe "$dest")"
    if [[ "$dest_real" == "$canonical_real" ]]; then
      echo "OK    $dest -> $canonical_real"
      count_ok=$((count_ok+1))
      continue
    fi

    echo "FIX   $dest (wrong symlink target)"
    run_cmd rm -f "$dest"
    run_cmd ln -s "$canonical" "$dest"
    count_relinked=$((count_relinked+1))
    continue
  fi

  if [[ -e "$dest" ]]; then
    stamp="$(ts_now)"
    backup="$(backup_path "$dest" "$stamp")"
    echo "MOVE  $dest -> $backup"
    run_cmd mv "$dest" "$backup"
    count_renamed=$((count_renamed+1))
  fi

  echo "LINK  $dest -> $canonical"
  run_cmd ln -s "$canonical" "$dest"
  count_linked=$((count_linked+1))
done
shopt -u nullglob

echo
printf 'Summary: total=%d ok=%d linked=%d relinked=%d renamed=%d skipped=%d\n' \
  "$count_total" "$count_ok" "$count_linked" "$count_relinked" "$count_renamed" "$count_skipped"
