#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT_DIR="${PI_NPM_PACKAGES_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd -P)}"
# Pi auto-discovers global extensions from ~/.pi/agent/extensions and global skills from ~/.pi/agent/skills.
# Keep DOTFILES_* env vars as backwards-compatible aliases for older usage.
EXT_DIR="${PI_EXT_DIR:-${DOTFILES_EXT_DIR:-$HOME/.pi/agent/extensions}}"
SKILL_DIR="${PI_SKILL_DIR:-${DOTFILES_SKILL_DIR:-$HOME/.pi/agent/skills}}"
THEME_DIR="${PI_THEME_DIR:-${DOTFILES_THEME_DIR:-$HOME/.pi/agent/themes}}"
PROMPT_DIR="${PI_PROMPT_DIR:-${DOTFILES_PROMPT_DIR:-$HOME/.pi/agent/prompts}}"
DRY_RUN=0
USE_COLOR=0
SUMMARY_LINES=()
DEP_TOTAL=0
DEP_OK=0
DEP_LINKED=0
DEP_RELINKED=0
DEP_RENAMED=0
DEP_SKIPPED=0
ENSURE_RESULT=""

usage() {
  cat <<'EOF'
Usage:
  sync-pi-package-symlinks.sh [--dry-run] [--color=auto|always|never]

Ensures local npm-packages Pi resources are live-linked for development:

- every pi-extension-* package gets a matching
  ~/.pi/agent/extensions/<name>.ts symlink to its canonical
  npm-packages/pi-extension-<name>/index.ts file
- every pi-package-* package with index.ts gets a matching
  ~/.pi/agent/extensions/<name>.ts symlink, except shared utility packages
- pi-utils is linked only as a node_modules dependency, not as a loadable
  extension, because it is a shared utility package
- every packaged skill under pi-*/skills/<skill-name>/SKILL.md gets a
  ~/.pi/agent/skills/<skill-name> symlink to that package skill directory
- every prompt template under pi-*/prompts/*.md gets a
  ~/.pi/agent/prompts/<prompt>.md symlink to that package prompt file
- every theme under pi-*/themes/*.json gets a
  ~/.pi/agent/themes/<theme>.json symlink to that package theme file
- every workspace package gets a matching node_modules symlink by package name
  for local bare-import resolution

If a non-symlink file/directory already exists at the destination, it is renamed to:
  <path>.hardcoded.<timestamp>.bak
then replaced with the canonical symlink.

Options:
  --dry-run                 Show planned actions without changing files
  --color=auto|always|never Colorize action/result labels (default: auto)
  -h, --help                Show this help

Env:
  PI_EXT_DIR          Override target extensions directory
  DOTFILES_EXT_DIR    Backwards-compatible alias for PI_EXT_DIR
  PI_SKILL_DIR        Override target skills directory
  DOTFILES_SKILL_DIR  Backwards-compatible alias for PI_SKILL_DIR
  PI_THEME_DIR         Override target themes directory
  DOTFILES_THEME_DIR   Backwards-compatible alias for PI_THEME_DIR
  PI_PROMPT_DIR        Override target prompts directory
  DOTFILES_PROMPT_DIR  Backwards-compatible alias for PI_PROMPT_DIR
EOF
}

COLOR_MODE="${PI_SYNC_COLOR:-auto}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --color=auto|--color=always|--color=never)
      COLOR_MODE="${1#--color=}"
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

case "$COLOR_MODE" in
  always) USE_COLOR=1 ;;
  never) USE_COLOR=0 ;;
  auto) [[ -t 1 && -z "${NO_COLOR:-}" ]] && USE_COLOR=1 || USE_COLOR=0 ;;
  *)
    echo "ERROR: unknown color mode '$COLOR_MODE'" >&2
    usage
    exit 1
    ;;
esac

mkdir -p "$EXT_DIR" "$SKILL_DIR" "$THEME_DIR" "$PROMPT_DIR"

color() {
  local code="$1"
  local text="$2"
  if [[ $USE_COLOR -eq 1 ]]; then
    printf '\033[%sm%s\033[0m' "$code" "$text"
  else
    printf '%s' "$text"
  fi
}

label_ok() { color "32;1" "OK   "; }
label_link() { color "36;1" "LINK "; }
label_fix() { color "33;1" "FIX  "; }
label_move() { color "35;1" "MOVE "; }
label_skip() { color "90;1" "SKIP "; }
label_dry_run() { color "34;1" "DRY-RUN:"; }
label_summary() { color "1;4" "Summary:"; }
summary_value() {
  local key="$1"
  local value="$2"
  local code=""
  if [[ "$key" == "ok" ]]; then
    code="32"
  elif [[ "$value" != "0" ]]; then
    case "$key" in
      linked) code="36" ;;
      relinked|renamed) code="33" ;;
      skipped) code="90" ;;
    esac
  fi
  [[ -n "$code" ]] && color "$code" "$value" || printf '%s' "$value"
}

format_summary_line() {
  local label="$1" total="$2" ok="$3" linked="$4" relinked="$5" renamed="$6" skipped="$7"
  printf '%-11s total=%s ok=%s linked=%s relinked=%s renamed=%s skipped=%s' \
    "$label" \
    "$(summary_value total "$total")" \
    "$(summary_value ok "$ok")" \
    "$(summary_value linked "$linked")" \
    "$(summary_value relinked "$relinked")" \
    "$(summary_value renamed "$renamed")" \
    "$(summary_value skipped "$skipped")"
}

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
    printf '%s %s\n' "$(label_dry_run)" "$*"
  else
    "$@"
  fi
}

add_summary() {
  SUMMARY_LINES+=("$1")
}

print_summary() {
  echo
  label_summary
  echo
  printf '%s\n' "${SUMMARY_LINES[@]}"
}

ensure_symlink() {
  local source="$1"
  local dest="$2"
  local label="$3"
  ENSURE_RESULT=""

  if [[ -L "$dest" ]]; then
    local dest_real source_real
    dest_real="$(realpath_safe "$dest")"
    source_real="$(realpath_safe "$source")"
    if [[ "$dest_real" == "$source_real" ]]; then
      printf '%s %s -> %s\n' "$(label_ok)" "$dest" "$source_real"
      ENSURE_RESULT="ok"
      return 0
    fi
    printf '%s %s (wrong %s symlink target)\n' "$(label_fix)" "$dest" "$label"
    run_cmd rm -f "$dest"
    ENSURE_RESULT="relinked"
  elif [[ -e "$dest" ]]; then
    local stamp backup
    stamp="$(ts_now)"
    backup="$(backup_path "$dest" "$stamp")"
    printf '%s %s -> %s\n' "$(label_move)" "$dest" "$backup"
    run_cmd mv "$dest" "$backup"
    ENSURE_RESULT="renamed"
  fi

  printf '%s %s -> %s\n' "$(label_link)" "$dest" "$source"
  run_cmd ln -s "$source" "$dest"
  if [[ -z "$ENSURE_RESULT" ]]; then
    ENSURE_RESULT="linked"
  fi
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
  DEP_TOTAL=$((DEP_TOTAL+1))
  ensure_symlink "$source_dir" "$dest" "dependency"
  case "$ENSURE_RESULT" in
    ok) DEP_OK=$((DEP_OK+1)) ;;
    linked) DEP_LINKED=$((DEP_LINKED+1)) ;;
    relinked) DEP_RELINKED=$((DEP_RELINKED+1)) ;;
    renamed) DEP_RENAMED=$((DEP_RENAMED+1)) ;;
    *) DEP_SKIPPED=$((DEP_SKIPPED+1)) ;;
  esac
}

package_json_name() {
  local pkg_dir="$1"
  node -e '
    const fs = require("node:fs");
    const path = require("node:path");
    const pkg = JSON.parse(fs.readFileSync(path.join(process.argv[1], "package.json"), "utf8"));
    if (typeof pkg.name === "string" && pkg.name.length > 0) console.log(pkg.name);
  ' "$pkg_dir"
}

resource_name_from_dir() {
  local pkg_name="$1"
  case "$pkg_name" in
    pi-extension-*) printf '%s' "${pkg_name#pi-extension-}" ;;
    pi-package-*) printf '%s' "${pkg_name#pi-package-}" ;;
    pi-skill-*) printf '%s' "${pkg_name#pi-skill-}" ;;
    pi-*) printf '%s' "${pkg_name#pi-}" ;;
    *) printf '%s' "$pkg_name" ;;
  esac
}

ensure_shared_deps() {
  # Pi/jiti resolves bare imports relative to ~/.pi/agent/extensions/*.ts.
  # If it follows symlinks to the repo, Node may resolve relative to ROOT_DIR too.
  local base_dirs=("$EXT_DIR" "$ROOT_DIR")
  for base_dir in "${base_dirs[@]}"; do
    for pkg_dir in "$ROOT_DIR"/pi-*; do
      [[ -d "$pkg_dir" && -f "$pkg_dir/package.json" ]] || continue

      local workspace_name
      workspace_name="$(package_json_name "$pkg_dir")"
      [[ -n "$workspace_name" ]] || continue
      ensure_node_module_symlink "$workspace_name" "$pkg_dir" "$base_dir"
    done

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
  for pkg_dir in "$ROOT_DIR"/pi-extension-* "$ROOT_DIR"/pi-package-*; do
    [[ -d "$pkg_dir" ]] || continue
    [[ -f "$pkg_dir/package.json" ]] || continue

    local pkg_name ext_name canonical dest canonical_real dest_real stamp backup
    pkg_name="$(basename "$pkg_dir")"
    ext_name="$(resource_name_from_dir "$pkg_name")"
    canonical="$pkg_dir/index.ts"
    [[ -f "$canonical" ]] || continue

    count_total=$((count_total+1))
    dest="$EXT_DIR/${ext_name}.ts"

    canonical_real="$(realpath_safe "$canonical")"
    if [[ -z "$canonical_real" ]]; then
      printf '%s %s -> cannot resolve canonical realpath: %s\n' "$(label_skip)" "$pkg_name" "$canonical"
      count_skipped=$((count_skipped+1))
      continue
    fi

    if [[ -L "$dest" ]]; then
      dest_real="$(realpath_safe "$dest")"
      if [[ "$dest_real" == "$canonical_real" ]]; then
        printf '%s %s -> %s\n' "$(label_ok)" "$dest" "$canonical_real"
        count_ok=$((count_ok+1))
        continue
      fi

      printf '%s %s (wrong symlink target)\n' "$(label_fix)" "$dest"
      run_cmd rm -f "$dest"
      run_cmd ln -s "$canonical" "$dest"
      count_relinked=$((count_relinked+1))
      continue
    fi

    if [[ -e "$dest" ]]; then
      stamp="$(ts_now)"
      backup="$(backup_path "$dest" "$stamp")"
      printf '%s %s -> %s\n' "$(label_move)" "$dest" "$backup"
      run_cmd mv "$dest" "$backup"
      count_renamed=$((count_renamed+1))
    fi

    printf '%s %s -> %s\n' "$(label_link)" "$dest" "$canonical"
    run_cmd ln -s "$canonical" "$dest"
    count_linked=$((count_linked+1))
  done
  shopt -u nullglob

  add_summary "$(format_summary_line "Extensions:" "$count_total" "$count_ok" "$count_linked" "$count_relinked" "$count_renamed" "$count_skipped")"
}

sync_skill_symlinks() {
  local count_total=0 count_ok=0 count_linked=0 count_relinked=0 count_renamed=0 count_skipped=0

  shopt -s nullglob
  for skill_file in "$ROOT_DIR"/pi-*/skills/*/SKILL.md; do
    [[ -f "$skill_file" ]] || continue
    count_total=$((count_total+1))

    local skill_source skill_name dest source_real dest_real stamp backup
    skill_source="$(dirname "$skill_file")"
    skill_name="$(basename "$skill_source")"
    dest="$SKILL_DIR/$skill_name"

    source_real="$(realpath_safe "$skill_source")"
    if [[ -z "$source_real" ]]; then
      printf '%s skill %s -> cannot resolve source realpath: %s\n' "$(label_skip)" "$skill_name" "$skill_source"
      count_skipped=$((count_skipped+1))
      continue
    fi

    if [[ -L "$dest" ]]; then
      dest_real="$(realpath_safe "$dest")"
      if [[ "$dest_real" == "$source_real" ]]; then
        printf '%s %s -> %s\n' "$(label_ok)" "$dest" "$source_real"
        count_ok=$((count_ok+1))
        continue
      fi

      printf '%s %s (wrong skill symlink target)\n' "$(label_fix)" "$dest"
      run_cmd rm -f "$dest"
      run_cmd ln -s "$skill_source" "$dest"
      count_relinked=$((count_relinked+1))
      continue
    fi

    if [[ -e "$dest" ]]; then
      stamp="$(ts_now)"
      backup="$(backup_path "$dest" "$stamp")"
      printf '%s %s -> %s\n' "$(label_move)" "$dest" "$backup"
      run_cmd mv "$dest" "$backup"
      count_renamed=$((count_renamed+1))
    fi

    printf '%s %s -> %s\n' "$(label_link)" "$dest" "$skill_source"
    run_cmd ln -s "$skill_source" "$dest"
    count_linked=$((count_linked+1))
  done
  shopt -u nullglob

  add_summary "$(format_summary_line "Skills:" "$count_total" "$count_ok" "$count_linked" "$count_relinked" "$count_renamed" "$count_skipped")"
}

sync_prompt_symlinks() {
  local count_total=0 count_ok=0 count_linked=0 count_relinked=0 count_renamed=0 count_skipped=0

  shopt -s nullglob
  for prompt_file in "$ROOT_DIR"/pi-*/prompts/*.md; do
    [[ -f "$prompt_file" ]] || continue
    count_total=$((count_total+1))

    local prompt_name dest source_real dest_real stamp backup
    prompt_name="$(basename "$prompt_file")"
    dest="$PROMPT_DIR/$prompt_name"

    source_real="$(realpath_safe "$prompt_file")"
    if [[ -z "$source_real" ]]; then
      printf '%s prompt %s -> cannot resolve source realpath: %s\n' "$(label_skip)" "$prompt_name" "$prompt_file"
      count_skipped=$((count_skipped+1))
      continue
    fi

    if [[ -L "$dest" ]]; then
      dest_real="$(realpath_safe "$dest")"
      if [[ "$dest_real" == "$source_real" ]]; then
        printf '%s %s -> %s\n' "$(label_ok)" "$dest" "$source_real"
        count_ok=$((count_ok+1))
        continue
      fi

      printf '%s %s (wrong prompt symlink target)\n' "$(label_fix)" "$dest"
      run_cmd rm -f "$dest"
      run_cmd ln -s "$prompt_file" "$dest"
      count_relinked=$((count_relinked+1))
      continue
    fi

    if [[ -e "$dest" ]]; then
      stamp="$(ts_now)"
      backup="$(backup_path "$dest" "$stamp")"
      printf '%s %s -> %s\n' "$(label_move)" "$dest" "$backup"
      run_cmd mv "$dest" "$backup"
      count_renamed=$((count_renamed+1))
    fi

    printf '%s %s -> %s\n' "$(label_link)" "$dest" "$prompt_file"
    run_cmd ln -s "$prompt_file" "$dest"
    count_linked=$((count_linked+1))
  done
  shopt -u nullglob

  add_summary "$(format_summary_line "Prompts:" "$count_total" "$count_ok" "$count_linked" "$count_relinked" "$count_renamed" "$count_skipped")"
}

sync_theme_symlinks() {
  local count_total=0 count_ok=0 count_linked=0 count_relinked=0 count_renamed=0 count_skipped=0

  shopt -s nullglob
  for theme_file in "$ROOT_DIR"/pi-*/themes/*.json; do
    [[ -f "$theme_file" ]] || continue
    count_total=$((count_total+1))

    local theme_name dest source_real dest_real stamp backup
    theme_name="$(basename "$theme_file")"
    dest="$THEME_DIR/$theme_name"

    source_real="$(realpath_safe "$theme_file")"
    if [[ -z "$source_real" ]]; then
      printf '%s theme %s -> cannot resolve source realpath: %s\n' "$(label_skip)" "$theme_name" "$theme_file"
      count_skipped=$((count_skipped+1))
      continue
    fi

    if [[ -L "$dest" ]]; then
      dest_real="$(realpath_safe "$dest")"
      if [[ "$dest_real" == "$source_real" ]]; then
        printf '%s %s -> %s\n' "$(label_ok)" "$dest" "$source_real"
        count_ok=$((count_ok+1))
        continue
      fi

      printf '%s %s (wrong theme symlink target)\n' "$(label_fix)" "$dest"
      run_cmd rm -f "$dest"
      run_cmd ln -s "$theme_file" "$dest"
      count_relinked=$((count_relinked+1))
      continue
    fi

    if [[ -e "$dest" ]]; then
      stamp="$(ts_now)"
      backup="$(backup_path "$dest" "$stamp")"
      printf '%s %s -> %s\n' "$(label_move)" "$dest" "$backup"
      run_cmd mv "$dest" "$backup"
      count_renamed=$((count_renamed+1))
    fi

    printf '%s %s -> %s\n' "$(label_link)" "$dest" "$theme_file"
    run_cmd ln -s "$theme_file" "$dest"
    count_linked=$((count_linked+1))
  done
  shopt -u nullglob

  add_summary "$(format_summary_line "Themes:" "$count_total" "$count_ok" "$count_linked" "$count_relinked" "$count_renamed" "$count_skipped")"
}

sync_extension_symlinks
sync_skill_symlinks
sync_prompt_symlinks
sync_theme_symlinks
ensure_shared_deps
add_summary "$(format_summary_line "Node deps:" "$DEP_TOTAL" "$DEP_OK" "$DEP_LINKED" "$DEP_RELINKED" "$DEP_RENAMED" "$DEP_SKIPPED")"
print_summary
