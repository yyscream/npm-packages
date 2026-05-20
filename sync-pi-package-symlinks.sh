#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# Pi auto-discovers global extensions from ~/.pi/agent/extensions and global skills from ~/.pi/agent/skills.
# Keep DOTFILES_* env vars as backwards-compatible aliases for older usage.
EXT_DIR="${PI_EXT_DIR:-${DOTFILES_EXT_DIR:-$HOME/.pi/agent/extensions}}"
SKILL_DIR="${PI_SKILL_DIR:-${DOTFILES_SKILL_DIR:-$HOME/.pi/agent/skills}}"
THEME_DIR="${PI_THEME_DIR:-${DOTFILES_THEME_DIR:-$HOME/.pi/agent/themes}}"
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage:
  sync-pi-package-symlinks.sh [--dry-run]

Ensures local npm-packages Pi resources are live-linked for development:

- every pi-extension-* package gets a matching
  ~/.pi/agent/extensions/<name>.ts symlink to its canonical
  npm-packages/pi-extension-<name>/index.ts file
- pi-utils is linked only as a node_modules dependency, not as a loadable
  extension, because it is a shared utility package
- every packaged skill under pi-extension-*/skills/<skill-name>/SKILL.md gets a
  ~/.pi/agent/skills/<skill-name> symlink to that package skill directory
- every theme under pi-package-*/themes/*.json gets a
  ~/.pi/agent/themes/<theme>.json symlink to that package theme file

If a non-symlink file/directory already exists at the destination, it is renamed to:
  <path>.hardcoded.<timestamp>.bak
then replaced with the canonical symlink.

Options:
  --dry-run   Show planned actions without changing files
  -h, --help  Show this help

Env:
  PI_EXT_DIR          Override target extensions directory
  DOTFILES_EXT_DIR    Backwards-compatible alias for PI_EXT_DIR
  PI_SKILL_DIR        Override target skills directory
  DOTFILES_SKILL_DIR  Backwards-compatible alias for PI_SKILL_DIR
  PI_THEME_DIR        Override target themes directory
  DOTFILES_THEME_DIR  Backwards-compatible alias for PI_THEME_DIR
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

mkdir -p "$EXT_DIR" "$SKILL_DIR" "$THEME_DIR"

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
  local path="$1"

  # GNU coreutils (Linux, or greadlink/readlink -f when available).
  if command -v realpath >/dev/null 2>&1; then
    realpath "$path" 2>/dev/null && return 0
  fi
  if readlink -f "$path" >/dev/null 2>&1; then
    readlink -f "$path" 2>/dev/null && return 0
  fi

  # Portable macOS fallback. Resolves the containing directory physically and
  # appends the basename. Works for existing files and symlinks to existing files.
  local dir base
  dir="$(dirname "$path")"
  base="$(basename "$path")"
  if [[ -d "$dir" ]]; then
    (cd "$dir" && printf '%s/%s\n' "$(pwd -P)" "$base") 2>/dev/null && return 0
  fi

  return 1
}

run_cmd() {
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "DRY-RUN: $*"
  else
    "$@"
  fi
}

ensure_symlink() {
  local source="$1"
  local dest="$2"
  local label="$3"

  if [[ -L "$dest" ]]; then
    local dest_real source_real
    dest_real="$(realpath_safe "$dest")"
    source_real="$(realpath_safe "$source")"
    if [[ "$dest_real" == "$source_real" ]]; then
      echo "OK    $dest -> $source_real"
      return 0
    fi
    echo "FIX   $dest (wrong $label symlink target)"
    run_cmd rm -f "$dest"
  elif [[ -e "$dest" ]]; then
    local stamp backup
    stamp="$(ts_now)"
    backup="$(backup_path "$dest" "$stamp")"
    echo "MOVE  $dest -> $backup"
    run_cmd mv "$dest" "$backup"
  fi

  echo "LINK  $dest -> $source"
  run_cmd ln -s "$source" "$dest"
}

get_pi_package_dir() {
  local pi_bin pi_cli pi_dist
  pi_bin="$(command -v pi 2>/dev/null || true)"
  [[ -n "$pi_bin" ]] || return 1
  pi_cli="$(realpath_safe "$pi_bin")"
  [[ -n "$pi_cli" ]] || return 1
  pi_dist="$(dirname "$pi_cli")"
  (cd "$pi_dist/.." && pwd -P) 2>/dev/null
}

resolve_from_pi() {
  local name="$1"
  local pi_pkg_dir
  pi_pkg_dir="$(get_pi_package_dir)"
  [[ -n "$pi_pkg_dir" && -f "$pi_pkg_dir/package.json" ]] || return 0

  node -e '
    const { createRequire } = require("node:module");
    const fs = require("node:fs");
    const path = require("node:path");
    const req = createRequire(path.join(process.argv[1], "package.json"));
    let resolved;
    try {
      resolved = req.resolve(process.argv[2] + "/package.json");
    } catch {
      try {
        resolved = req.resolve(process.argv[2]);
      } catch {
        const nodeModulesRoot = path.basename(path.dirname(process.argv[1])).startsWith("@")
          ? path.dirname(path.dirname(process.argv[1]))
          : path.dirname(process.argv[1]);
        const candidate = path.join(nodeModulesRoot, process.argv[2]);
        if (fs.existsSync(path.join(candidate, "package.json"))) {
          console.log(candidate);
          process.exit(0);
        }
        throw new Error(`Cannot resolve ${process.argv[2]}`);
      }
    }
    let dir = fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);
    while (dir !== path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, "package.json"))) {
        console.log(dir);
        process.exit(0);
      }
      dir = path.dirname(dir);
    }
  ' "$pi_pkg_dir" "$name" 2>/dev/null || true
}

ensure_node_module_symlink() {
  local module_name="$1"
  local source_dir="$2"
  local base_dir="$3"
  local dest_dir dest

  if [[ "$module_name" == @*/* ]]; then
    dest_dir="$base_dir/node_modules/${module_name%/*}"
    dest="$dest_dir/${module_name#*/}"
  else
    dest_dir="$base_dir/node_modules"
    dest="$dest_dir/$module_name"
  fi

  run_cmd mkdir -p "$dest_dir"
  ensure_symlink "$source_dir" "$dest" "dependency"
}

ensure_shared_deps() {
  local utils_dir="$ROOT_DIR/pi-utils"
  [[ -d "$utils_dir" ]] || return 0

  # Pi/jiti resolves bare imports relative to ~/.pi/agent/extensions/*.ts.
  # If it follows symlinks to the repo, Node may resolve relative to ROOT_DIR too.
  local base_dirs=("$EXT_DIR" "$ROOT_DIR")
  for base_dir in "${base_dirs[@]}"; do
    ensure_node_module_symlink "@firstpick/pi-utils" "$utils_dir" "$base_dir"

    for module_name in typebox @earendil-works/pi-coding-agent @earendil-works/pi-tui @earendil-works/pi-ai; do
      local module_dir
      module_dir="$(resolve_from_pi "$module_name")"
      if [[ -n "$module_dir" && -d "$module_dir" ]]; then
        ensure_node_module_symlink "$module_name" "$module_dir" "$base_dir"
      fi
    done
  done
}

sync_extension_symlinks() {
  local count_total=0 count_ok=0 count_linked=0 count_relinked=0 count_renamed=0 count_skipped=0

  shopt -s nullglob
  for pkg_dir in "$ROOT_DIR"/pi-extension-*; do
    [[ -d "$pkg_dir" ]] || continue
    [[ -f "$pkg_dir/package.json" ]] || continue

    count_total=$((count_total+1))

    local pkg_name ext_name canonical dest canonical_real dest_real stamp backup
    pkg_name="$(basename "$pkg_dir")"
    if [[ "$pkg_name" == pi-extension-* ]]; then
      ext_name="${pkg_name#pi-extension-}"
    else
      ext_name="${pkg_name#pi-}"
    fi
    canonical="$pkg_dir/index.ts"
    dest="$EXT_DIR/${ext_name}.ts"
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

  printf 'Extensions: total=%d ok=%d linked=%d relinked=%d renamed=%d skipped=%d\n' \
    "$count_total" "$count_ok" "$count_linked" "$count_relinked" "$count_renamed" "$count_skipped"
}

sync_skill_symlinks() {
  local count_total=0 count_ok=0 count_linked=0 count_relinked=0 count_renamed=0 count_skipped=0

  shopt -s nullglob
  for skill_file in "$ROOT_DIR"/pi-extension-*/skills/*/SKILL.md; do
    [[ -f "$skill_file" ]] || continue
    count_total=$((count_total+1))

    local skill_source skill_name dest source_real dest_real stamp backup
    skill_source="$(dirname "$skill_file")"
    skill_name="$(basename "$skill_source")"
    dest="$SKILL_DIR/$skill_name"

    source_real="$(realpath_safe "$skill_source")"
    if [[ -z "$source_real" ]]; then
      echo "SKIP  skill $skill_name -> cannot resolve source realpath: $skill_source"
      count_skipped=$((count_skipped+1))
      continue
    fi

    if [[ -L "$dest" ]]; then
      dest_real="$(realpath_safe "$dest")"
      if [[ "$dest_real" == "$source_real" ]]; then
        echo "OK    $dest -> $source_real"
        count_ok=$((count_ok+1))
        continue
      fi

      echo "FIX   $dest (wrong skill symlink target)"
      run_cmd rm -f "$dest"
      run_cmd ln -s "$skill_source" "$dest"
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

    echo "LINK  $dest -> $skill_source"
    run_cmd ln -s "$skill_source" "$dest"
    count_linked=$((count_linked+1))
  done
  shopt -u nullglob

  printf 'Skills:     total=%d ok=%d linked=%d relinked=%d renamed=%d skipped=%d\n' \
    "$count_total" "$count_ok" "$count_linked" "$count_relinked" "$count_renamed" "$count_skipped"
}

sync_theme_symlinks() {
  local count_total=0 count_ok=0 count_linked=0 count_relinked=0 count_renamed=0 count_skipped=0

  shopt -s nullglob
  for theme_file in "$ROOT_DIR"/pi-package-*/themes/*.json; do
    [[ -f "$theme_file" ]] || continue
    count_total=$((count_total+1))

    local theme_name dest source_real dest_real stamp backup
    theme_name="$(basename "$theme_file")"
    dest="$THEME_DIR/$theme_name"

    source_real="$(realpath_safe "$theme_file")"
    if [[ -z "$source_real" ]]; then
      echo "SKIP  theme $theme_name -> cannot resolve source realpath: $theme_file"
      count_skipped=$((count_skipped+1))
      continue
    fi

    if [[ -L "$dest" ]]; then
      dest_real="$(realpath_safe "$dest")"
      if [[ "$dest_real" == "$source_real" ]]; then
        echo "OK    $dest -> $source_real"
        count_ok=$((count_ok+1))
        continue
      fi

      echo "FIX   $dest (wrong theme symlink target)"
      run_cmd rm -f "$dest"
      run_cmd ln -s "$theme_file" "$dest"
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

    echo "LINK  $dest -> $theme_file"
    run_cmd ln -s "$theme_file" "$dest"
    count_linked=$((count_linked+1))
  done
  shopt -u nullglob

  printf 'Themes:     total=%d ok=%d linked=%d relinked=%d renamed=%d skipped=%d\n' \
    "$count_total" "$count_ok" "$count_linked" "$count_relinked" "$count_renamed" "$count_skipped"
}

sync_extension_symlinks
sync_skill_symlinks
sync_theme_symlinks
ensure_shared_deps
