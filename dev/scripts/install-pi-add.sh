#!/usr/bin/env bash
# install-pi-add.sh
#
# What this script does:
# - Discovers local Pi package.json files in this repository for extensions, skills, and packages
#   (pi-extension-*/, pi-skill-*/, pi-package-*/).
# - Lets you choose which packages to install/update (interactive by default), or installs all actionable packages with --all.
# - Compares local package versions with Pi-installed versions and hides unchanged ones unless --force is used.
# - Runs `pi install npm:<package>` for each selected package (or only prints commands with --dry-run).
#
# How to use:
# - Run `./dev/scripts/install-pi-add.sh` for interactive selection.
# - Run `./dev/scripts/install-pi-add.sh --all` for non-interactive install/update of actionable packages.
# - Add `--dry-run` to preview actions and `--force` to show/reinstall same-version packages.
#
# Why this script exists:
# - It provides a repeatable, repo-local workflow to install/test this repo's Pi npm packages
#   without manually running install commands for each extension/skill/package.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${PI_NPM_PACKAGES_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd -P)}"
DRY_RUN=0
INSTALL_ALL=0
FORCE_INSTALL=0

usage() {
  cat <<'EOF'
Usage:
  install-pi-add.sh [options]

Discovers and installs local Pi extension/skill/package npm packages.

Options:
  --all          Install/update all actionable packages (non-interactive)
  --dry-run      Print install commands without running them
  --force        Show and allow reinstalling packages already at the same version
  -h, --help     Show this help

Examples:
  ./dev/scripts/install-pi-add.sh
  ./dev/scripts/install-pi-add.sh --all
  ./dev/scripts/install-pi-add.sh --all --force
  ./dev/scripts/install-pi-add.sh --dry-run
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all)
      INSTALL_ALL=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --force)
      FORCE_INSTALL=1
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

if ! command -v pi >/dev/null 2>&1; then
  echo "ERROR: pi is required but not found in PATH." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required but not found in PATH." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is required but not found in PATH." >&2
  exit 1
fi

format_duration() {
  local seconds="${1:-0}"
  if (( seconds < 0 )); then
    seconds=0
  fi

  local hours=$((seconds / 3600))
  local minutes=$(((seconds % 3600) / 60))
  local secs=$((seconds % 60))

  if (( hours > 0 )); then
    printf "%dh%02dm%02ds" "$hours" "$minutes" "$secs"
  elif (( minutes > 0 )); then
    printf "%dm%02ds" "$minutes" "$secs"
  else
    printf "%ds" "$secs"
  fi
}

render_check_progress() {
  local current="$1"
  local total="$2"
  local start_seconds="$3"
  local bar_width=28

  if (( total <= 0 )); then
    return
  fi

  local elapsed=$((SECONDS - start_seconds))
  local remaining=0
  if (( current > 0 )); then
    remaining=$((elapsed * (total - current) / current))
  fi

  local percent=$((current * 100 / total))
  local filled_width=$((current * bar_width / total))
  local empty_width=$((bar_width - filled_width))
  local filled_bar=""
  local empty_bar=""
  filled_bar="$(printf '%*s' "$filled_width" '' | tr ' ' '#')"
  empty_bar="$(printf '%*s' "$empty_width" '' | tr ' ' '-')"

  printf "\rChecking package statuses: [%s%s] %3d%% (%d/%d) elapsed %s, left %s" \
    "$filled_bar" "$empty_bar" "$percent" "$current" "$total" \
    "$(format_duration "$elapsed")" "$(format_duration "$remaining")"
}

PACKAGE_JSON_FILES=()
for pattern in \
  "$ROOT_DIR"/pi-extension-*/package.json \
  "$ROOT_DIR"/pi-skill-*/package.json \
  "$ROOT_DIR"/pi-package-*/package.json
  do
  for package_json in $pattern; do
    if [[ -f "$package_json" ]]; then
      PACKAGE_JSON_FILES+=("$package_json")
    fi
  done
done

if [[ ${#PACKAGE_JSON_FILES[@]} -eq 0 ]]; then
  echo "No local pi-extension/pi-skill/pi-package package.json files found under $ROOT_DIR"
  exit 0
fi

PI_USER_NPM_NODE_MODULES="$(
  node <<'NODE'
const { homedir } = require("node:os");
const { join } = require("node:path");

let agentDir = process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");
if (agentDir === "~") {
  agentDir = homedir();
} else if (agentDir.startsWith("~/") || (process.platform === "win32" && agentDir.startsWith("~\\"))) {
  agentDir = join(homedir(), agentDir.slice(2));
}

process.stdout.write(join(agentDir, "npm", "node_modules"));
NODE
)"
LEGACY_NPM_GLOBAL_ROOT="$(npm root -g 2>/dev/null || true)"

echo "Discovered ${#PACKAGE_JSON_FILES[@]} local Pi package(s) (extensions/skills/packages)."

PACKAGE_NAMES=()
PACKAGE_REPO_VERSIONS=()
PACKAGE_KINDS=()
PACKAGE_INSTALLED_VERSIONS=()
PACKAGE_STATUS_LABELS=()
NEW_INSTALL_CANDIDATES=()
UPDATE_CANDIDATES=()
UP_TO_DATE_CANDIDATES=()
FORCE_REINSTALL_CANDIDATES=()
SELECTABLE_PACKAGE_INDEXES=()
CHECK_PROGRESS_ENABLED=0
CHECK_PROGRESS_TOTAL=${#PACKAGE_JSON_FILES[@]}
CHECK_PROGRESS_START_SECONDS=$SECONDS
CHECK_PROGRESS_COUNT=0
if [[ -t 1 ]]; then
  CHECK_PROGRESS_ENABLED=1
  render_check_progress 0 "$CHECK_PROGRESS_TOTAL" "$CHECK_PROGRESS_START_SECONDS"
else
  echo "Checking package statuses ($CHECK_PROGRESS_TOTAL packages)..."
fi

for package_json in "${PACKAGE_JSON_FILES[@]}"; do
  package_name="$(node -p "require(process.argv[1]).name" "$package_json" 2>/dev/null || true)"
  package_version="$(node -p "require(process.argv[1]).version" "$package_json" 2>/dev/null || true)"
  package_dir_name="$(basename "$(dirname "$package_json")")"
  package_kind="package"
  if [[ "$package_dir_name" == pi-extension-* ]]; then
    package_kind="extension"
  elif [[ "$package_dir_name" == pi-skill-* ]]; then
    package_kind="skill"
  elif [[ "$package_dir_name" == pi-package-* ]]; then
    package_kind="package"
  fi

  if [[ -z "$package_name" || "$package_name" == "undefined" ]]; then
    if [[ $CHECK_PROGRESS_ENABLED -eq 1 ]]; then
      echo
    fi
    echo "WARN: skipping '$package_json' because package name could not be read." >&2
    CHECK_PROGRESS_COUNT=$((CHECK_PROGRESS_COUNT + 1))
    if [[ $CHECK_PROGRESS_ENABLED -eq 1 ]]; then
      render_check_progress "$CHECK_PROGRESS_COUNT" "$CHECK_PROGRESS_TOTAL" "$CHECK_PROGRESS_START_SECONDS"
    fi
    continue
  fi
  if [[ -z "$package_version" || "$package_version" == "undefined" ]]; then
    if [[ $CHECK_PROGRESS_ENABLED -eq 1 ]]; then
      echo
    fi
    echo "WARN: skipping '$package_json' because package version could not be read." >&2
    CHECK_PROGRESS_COUNT=$((CHECK_PROGRESS_COUNT + 1))
    if [[ $CHECK_PROGRESS_ENABLED -eq 1 ]]; then
      render_check_progress "$CHECK_PROGRESS_COUNT" "$CHECK_PROGRESS_TOTAL" "$CHECK_PROGRESS_START_SECONDS"
    fi
    continue
  fi

  package_index="${#PACKAGE_NAMES[@]}"
  PACKAGE_NAMES+=("$package_name")
  PACKAGE_REPO_VERSIONS+=("$package_version")
  PACKAGE_KINDS+=("$package_kind")

  installed_package_json=""
  pi_package_json="$PI_USER_NPM_NODE_MODULES/$package_name/package.json"
  legacy_package_json=""
  if [[ -n "$LEGACY_NPM_GLOBAL_ROOT" ]]; then
    legacy_package_json="$LEGACY_NPM_GLOBAL_ROOT/$package_name/package.json"
  fi

  # Pi installs user-scoped npm packages under ~/.pi/agent/npm/node_modules.
  # Fall back to the legacy global npm root only when no managed Pi install exists.
  if [[ -f "$pi_package_json" ]]; then
    installed_package_json="$pi_package_json"
  elif [[ -n "$legacy_package_json" && -f "$legacy_package_json" ]]; then
    installed_package_json="$legacy_package_json"
  fi

  installed_version=""
  if [[ -n "$installed_package_json" ]]; then
    installed_version="$(node -p "require(process.argv[1]).version" "$installed_package_json" 2>/dev/null || true)"
  fi

  PACKAGE_INSTALLED_VERSIONS+=("$installed_version")
  if [[ -z "$installed_version" ]]; then
    PACKAGE_STATUS_LABELS+=("new install -> $package_version")
    NEW_INSTALL_CANDIDATES+=("${package_name}@${package_version}")
    SELECTABLE_PACKAGE_INDEXES+=("$package_index")
  elif [[ "$installed_version" == "$package_version" ]]; then
    if [[ $FORCE_INSTALL -eq 1 ]]; then
      PACKAGE_STATUS_LABELS+=("force reinstall $package_version")
      FORCE_REINSTALL_CANDIDATES+=("${package_name}@${package_version}")
      SELECTABLE_PACKAGE_INDEXES+=("$package_index")
    else
      PACKAGE_STATUS_LABELS+=("up to date $package_version")
      UP_TO_DATE_CANDIDATES+=("${package_name}@${package_version}")
    fi
  else
    PACKAGE_STATUS_LABELS+=("update $installed_version -> $package_version")
    UPDATE_CANDIDATES+=("${package_name} (${installed_version} -> ${package_version})")
    SELECTABLE_PACKAGE_INDEXES+=("$package_index")
  fi

  CHECK_PROGRESS_COUNT=$((CHECK_PROGRESS_COUNT + 1))
  if [[ $CHECK_PROGRESS_ENABLED -eq 1 ]]; then
    render_check_progress "$CHECK_PROGRESS_COUNT" "$CHECK_PROGRESS_TOTAL" "$CHECK_PROGRESS_START_SECONDS"
  fi
done
if [[ $CHECK_PROGRESS_ENABLED -eq 1 ]]; then
  echo
fi

if [[ ${#PACKAGE_NAMES[@]} -eq 0 ]]; then
  echo "No valid package names discovered."
  exit 1
fi

echo "Status before selection:"
echo "  New installs available: ${#NEW_INSTALL_CANDIDATES[@]}"
echo "  Updates available: ${#UPDATE_CANDIDATES[@]}"
if [[ $FORCE_INSTALL -eq 1 ]]; then
  echo "  Force reinstalls available: ${#FORCE_REINSTALL_CANDIDATES[@]}"
else
  echo "  Already up to date (hidden; use --force to show/reinstall): ${#UP_TO_DATE_CANDIDATES[@]}"
fi

if [[ ${#SELECTABLE_PACKAGE_INDEXES[@]} -eq 0 ]]; then
  if [[ $FORCE_INSTALL -eq 1 ]]; then
    echo "No packages available to install/update/reinstall. Exiting."
  else
    echo "No packages to install/update. Use --force to show/reinstall already up-to-date packages."
  fi
  exit 0
fi

SELECTED_PACKAGES=()
if [[ $INSTALL_ALL -eq 1 ]]; then
  for package_index in "${SELECTABLE_PACKAGE_INDEXES[@]}"; do
    SELECTED_PACKAGES+=("${PACKAGE_NAMES[$package_index]}")
  done
else
  if [[ ! -t 0 ]]; then
    echo "ERROR: interactive mode requires a TTY. Use --all for non-interactive usage." >&2
    exit 1
  fi

  if [[ $FORCE_INSTALL -eq 1 ]]; then
    echo "Select package numbers to install/update/reinstall (space/comma separated), or type 'all':"
  else
    echo "Select package numbers to install/update (space/comma separated), or type 'all':"
  fi
  for display_idx in "${!SELECTABLE_PACKAGE_INDEXES[@]}"; do
    package_index="${SELECTABLE_PACKAGE_INDEXES[$display_idx]}"
    package_name="${PACKAGE_NAMES[$package_index]}"
    printf "  %2d) %-58s [%s] %s\n" "$((display_idx + 1))" "$package_name" "${PACKAGE_KINDS[$package_index]}" "${PACKAGE_STATUS_LABELS[$package_index]}"
  done
  printf "> "
  read -r selection

  trimmed_selection="${selection//[[:space:]]/}"
  if [[ -z "$trimmed_selection" ]]; then
    echo "No packages selected. Exiting."
    exit 0
  fi

  lower_trimmed_selection="$(printf '%s' "$trimmed_selection" | tr '[:upper:]' '[:lower:]')"
  if [[ "$lower_trimmed_selection" == "all" ]]; then
    for package_index in "${SELECTABLE_PACKAGE_INDEXES[@]}"; do
      SELECTED_PACKAGES+=("${PACKAGE_NAMES[$package_index]}")
    done
  else
    normalized_selection="${selection//,/ }"
    for token in $normalized_selection; do
      if [[ ! "$token" =~ ^[0-9]+$ ]]; then
        echo "ERROR: invalid selection token '$token'." >&2
        exit 1
      fi
      if (( token < 1 || token > ${#SELECTABLE_PACKAGE_INDEXES[@]} )); then
        echo "ERROR: selection '$token' is out of range." >&2
        exit 1
      fi
      package_index="${SELECTABLE_PACKAGE_INDEXES[$((token - 1))]}"
      SELECTED_PACKAGES+=("${PACKAGE_NAMES[$package_index]}")
    done
  fi

  if [[ ${#SELECTED_PACKAGES[@]} -eq 0 ]]; then
    echo "No packages selected. Exiting."
    exit 0
  fi
fi
NEWLY_INSTALLED=()
UPDATED_PACKAGES=()
REINSTALLED_PACKAGES=()
SKIPPED_UP_TO_DATE=()

for package_name in "${SELECTED_PACKAGES[@]}"; do
  package_index=-1
  for idx in "${!PACKAGE_NAMES[@]}"; do
    if [[ "${PACKAGE_NAMES[$idx]}" == "$package_name" ]]; then
      package_index="$idx"
      break
    fi
  done
  if [[ "$package_index" -lt 0 ]]; then
    echo "WARN: skipping '$package_name' because its metadata could not be found." >&2
    continue
  fi

  repo_version="${PACKAGE_REPO_VERSIONS[$package_index]}"
  installed_version="${PACKAGE_INSTALLED_VERSIONS[$package_index]}"
  package_kind="${PACKAGE_KINDS[$package_index]}"

  if [[ $FORCE_INSTALL -eq 0 && -n "$installed_version" && "$installed_version" == "$repo_version" ]]; then
    echo "Skipping ${package_kind} npm:${package_name} (already installed at version $installed_version)"
    SKIPPED_UP_TO_DATE+=("${package_name}@${installed_version}")
    continue
  fi

  install_target="npm:${package_name}"
  if [[ $FORCE_INSTALL -eq 1 && -n "$installed_version" && "$installed_version" == "$repo_version" ]]; then
    echo "Installing ${package_kind} $install_target (force reinstall version $repo_version)"
    REINSTALLED_PACKAGES+=("${package_name}@${repo_version}")
  elif [[ -n "$installed_version" ]]; then
    echo "Installing ${package_kind} $install_target (updating $installed_version -> $repo_version)"
    UPDATED_PACKAGES+=("${package_name} (${installed_version} -> ${repo_version})")
  else
    echo "Installing ${package_kind} $install_target (target version $repo_version)"
    NEWLY_INSTALLED+=("${package_name}@${repo_version}")
  fi

  if [[ $DRY_RUN -eq 1 ]]; then
    echo "  pi install $install_target"
  else
    pi install "$install_target"
  fi
done

echo
echo "Summary:"
echo "  Newly installed: ${#NEWLY_INSTALLED[@]}"
for entry in ${NEWLY_INSTALLED[@]+"${NEWLY_INSTALLED[@]}"}; do
  echo "    - $entry"
done
echo "  Updated packages: ${#UPDATED_PACKAGES[@]}"
for entry in ${UPDATED_PACKAGES[@]+"${UPDATED_PACKAGES[@]}"}; do
  echo "    - $entry"
done
echo "  Reinstalled packages: ${#REINSTALLED_PACKAGES[@]}"
for entry in ${REINSTALLED_PACKAGES[@]+"${REINSTALLED_PACKAGES[@]}"}; do
  echo "    - $entry"
done
echo "  Skipped (already up to date): ${#SKIPPED_UP_TO_DATE[@]}"
for entry in ${SKIPPED_UP_TO_DATE[@]+"${SKIPPED_UP_TO_DATE[@]}"}; do
  echo "    - $entry"
done

echo "Done."
