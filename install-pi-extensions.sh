#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=0
INSTALL_ALL=0
FORCE_INSTALL=0

usage() {
  cat <<'EOF'
Usage:
  install-pi-extensions.sh [options]

Options:
  --all          Install all discovered packages (non-interactive)
  --dry-run      Print install commands without running them
  --force        Reinstall even if same version is already installed
  -h, --help     Show this help

Examples:
  ./install-pi-extensions.sh
  ./install-pi-extensions.sh --all
  ./install-pi-extensions.sh --all --force
  ./install-pi-extensions.sh --dry-run
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

mapfile -t PACKAGE_JSON_FILES < <(printf '%s\n' "$ROOT_DIR"/pi-extension-*/package.json)

if [[ ${#PACKAGE_JSON_FILES[@]} -eq 0 ]]; then
  echo "No pi-extension package.json files found under $ROOT_DIR"
  exit 0
fi

echo "Discovered ${#PACKAGE_JSON_FILES[@]} extension package(s)."

PACKAGE_NAMES=()
declare -A PACKAGE_REPO_VERSIONS=()
for package_json in "${PACKAGE_JSON_FILES[@]}"; do
  package_name="$(node -p "require(process.argv[1]).name" "$package_json" 2>/dev/null || true)"
  package_version="$(node -p "require(process.argv[1]).version" "$package_json" 2>/dev/null || true)"
  if [[ -z "$package_name" || "$package_name" == "undefined" ]]; then
    echo "WARN: skipping '$package_json' because package name could not be read." >&2
    continue
  fi
  if [[ -z "$package_version" || "$package_version" == "undefined" ]]; then
    echo "WARN: skipping '$package_json' because package version could not be read." >&2
    continue
  fi
  PACKAGE_NAMES+=("$package_name")
  PACKAGE_REPO_VERSIONS["$package_name"]="$package_version"
done

if [[ ${#PACKAGE_NAMES[@]} -eq 0 ]]; then
  echo "No valid package names discovered."
  exit 1
fi

SELECTED_PACKAGES=()
if [[ $INSTALL_ALL -eq 1 ]]; then
  SELECTED_PACKAGES=("${PACKAGE_NAMES[@]}")
else
  if [[ ! -t 0 ]]; then
    echo "ERROR: interactive mode requires a TTY. Use --all for non-interactive usage." >&2
    exit 1
  fi

  echo "Select package numbers to install (space/comma separated), or type 'all':"
  for idx in "${!PACKAGE_NAMES[@]}"; do
    printf "  %2d) %s\n" "$((idx + 1))" "${PACKAGE_NAMES[$idx]}"
  done
  printf "> "
  read -r selection

  trimmed_selection="${selection//[[:space:]]/}"
  if [[ -z "$trimmed_selection" ]]; then
    echo "No packages selected. Exiting."
    exit 0
  fi

  if [[ "${trimmed_selection,,}" == "all" ]]; then
    SELECTED_PACKAGES=("${PACKAGE_NAMES[@]}")
  else
    normalized_selection="${selection//,/ }"
    for token in $normalized_selection; do
      if [[ ! "$token" =~ ^[0-9]+$ ]]; then
        echo "ERROR: invalid selection token '$token'." >&2
        exit 1
      fi
      if (( token < 1 || token > ${#PACKAGE_NAMES[@]} )); then
        echo "ERROR: selection '$token' is out of range." >&2
        exit 1
      fi
      SELECTED_PACKAGES+=("${PACKAGE_NAMES[$((token - 1))]}")
    done
  fi

  if [[ ${#SELECTED_PACKAGES[@]} -eq 0 ]]; then
    echo "No packages selected. Exiting."
    exit 0
  fi
fi

NPM_GLOBAL_ROOT="$(npm root -g 2>/dev/null || true)"
NEWLY_INSTALLED=()
UPDATED_PACKAGES=()
SKIPPED_UP_TO_DATE=()

for package_name in "${SELECTED_PACKAGES[@]}"; do
  repo_version="${PACKAGE_REPO_VERSIONS[$package_name]}"
  installed_package_json=""
  if [[ -n "$NPM_GLOBAL_ROOT" ]]; then
    installed_package_json="$NPM_GLOBAL_ROOT/$package_name/package.json"
  fi
  installed_version=""
  if [[ -n "$installed_package_json" && -f "$installed_package_json" ]]; then
    installed_version="$(node -p "require(process.argv[1]).version" "$installed_package_json" 2>/dev/null || true)"
  fi

  if [[ $FORCE_INSTALL -eq 0 && -n "$installed_version" && "$installed_version" == "$repo_version" ]]; then
    echo "Skipping npm:${package_name} (already installed at version $installed_version)"
    SKIPPED_UP_TO_DATE+=("${package_name}@${installed_version}")
    continue
  fi

  install_target="npm:${package_name}"
  if [[ $FORCE_INSTALL -eq 1 && -n "$installed_version" && "$installed_version" == "$repo_version" ]]; then
    echo "Installing $install_target (force reinstall version $repo_version)"
    UPDATED_PACKAGES+=("${package_name} (forced reinstall ${repo_version})")
  elif [[ -n "$installed_version" ]]; then
    echo "Installing $install_target (updating $installed_version -> $repo_version)"
    UPDATED_PACKAGES+=("${package_name} (${installed_version} -> ${repo_version})")
  else
    echo "Installing $install_target (target version $repo_version)"
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
for entry in "${NEWLY_INSTALLED[@]}"; do
  echo "    - $entry"
done
echo "  Updated packages: ${#UPDATED_PACKAGES[@]}"
for entry in "${UPDATED_PACKAGES[@]}"; do
  echo "    - $entry"
done
echo "  Skipped (already up to date): ${#SKIPPED_UP_TO_DATE[@]}"
for entry in "${SKIPPED_UP_TO_DATE[@]}"; do
  echo "    - $entry"
done

echo "Done."
