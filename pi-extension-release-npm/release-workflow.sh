#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${PI_NPM_PACKAGES_ROOT:-$SCRIPT_DIR}"

MODE=""
TARGET="all"
PUBLISHER="npm"
ACCESS="public"
CHECK_ALT_CLIENT=0
STRICT_AUTH=1

usage() {
  cat <<'EOF'
Usage:
  ./release-workflow.sh <--check|--plan|--publish> [options]

Modes (choose exactly one):
  --check      Run readiness checks and report required version bumps only
  --plan       Run version bump planning, then publish planning/checks (no writes/publish)
  --publish    Apply required version bumps, then publish; failures are handled per package

Options:
  --target <name|all>          Target one package directory or all (default: all)
  --all                        Same as --target all
  --publisher <auto|bun|npm>   Publisher client (default: npm; bun is fallback when available)
  --access <public|restricted> Publish access for --publish/--plan (default: public)
  --check-alt-client           For --check: also dry-run with alternate client
  --no-strict-auth             For --publish/--plan: disable strict auth
  -h, --help                   Show help

Examples:
  ./release-workflow.sh --check --all
  ./release-workflow.sh --plan --target pi-extension-notes
  ./release-workflow.sh --publish --all
EOF
}

require_mode() {
  if [[ -n "$MODE" ]]; then
    echo "ERROR: choose exactly one mode: --check, --plan, or --publish" >&2
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)
      require_mode
      MODE="check"
      shift
      ;;
    --plan)
      require_mode
      MODE="plan"
      shift
      ;;
    --publish)
      require_mode
      MODE="publish"
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
    --publisher)
      PUBLISHER="${2:-}"
      shift 2
      ;;
    --access)
      ACCESS="${2:-}"
      shift 2
      ;;
    --check-alt-client)
      CHECK_ALT_CLIENT=1
      shift
      ;;
    --no-strict-auth)
      STRICT_AUTH=0
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

if [[ -z "$MODE" ]]; then
  echo "ERROR: you must pass one mode: --check, --plan, or --publish" >&2
  usage
  exit 1
fi

if [[ "$PUBLISHER" != "auto" && "$PUBLISHER" != "bun" && "$PUBLISHER" != "npm" ]]; then
  echo "ERROR: --publisher must be auto, bun, or npm" >&2
  exit 1
fi

if [[ "$ACCESS" != "public" && "$ACCESS" != "restricted" ]]; then
  echo "ERROR: --access must be public or restricted" >&2
  exit 1
fi

CHECK_SCRIPT="$SCRIPT_DIR/check-publish-readiness.sh"
BUMP_SCRIPT="$SCRIPT_DIR/bump-package-versions.sh"
PUBLISH_SCRIPT="$SCRIPT_DIR/publish-packages.sh"

if [[ ! -x "$CHECK_SCRIPT" ]]; then
  echo "ERROR: missing executable $CHECK_SCRIPT" >&2
  exit 1
fi
if [[ ! -x "$BUMP_SCRIPT" ]]; then
  echo "ERROR: missing executable $BUMP_SCRIPT" >&2
  exit 1
fi
if [[ ! -x "$PUBLISH_SCRIPT" ]]; then
  echo "ERROR: missing executable $PUBLISH_SCRIPT" >&2
  exit 1
fi

case "$MODE" in
  check)
    check_cmd=("$CHECK_SCRIPT" --target "$TARGET" --publisher "$PUBLISHER")
    if [[ $CHECK_ALT_CLIENT -eq 1 ]]; then
      check_cmd+=(--check-alt-client)
    fi
    echo "Running: ${check_cmd[*]}"
    set +e
    "${check_cmd[@]}"
    check_status=$?
    set -e

    echo
    bump_cmd=("$BUMP_SCRIPT" --target "$TARGET")
    echo "Reporting required version bumps: ${bump_cmd[*]}"
    "${bump_cmd[@]}"

    exit "$check_status"
    ;;

  plan)
    tmp_root="$(mktemp -d)"
    cleanup_plan_tmp() {
      rm -rf "$tmp_root"
    }
    trap cleanup_plan_tmp EXIT

    candidate_targets_file="$tmp_root/publish-targets.txt"
    workspace_root="$tmp_root/workspace"
    mkdir -p "$workspace_root"

    bump_cmd=("$BUMP_SCRIPT" --target "$TARGET" --candidate-targets-file "$candidate_targets_file")
    echo "Planning required version bumps: ${bump_cmd[*]}"
    "${bump_cmd[@]}"
    echo

    if [[ ! -s "$candidate_targets_file" ]]; then
      echo "No publish candidates detected by version planning; skipping publish plan checks."
      exit 0
    fi

    echo "Publish candidates from version planning:"
    sed 's/^/  - /' "$candidate_targets_file"
    echo

    echo "Preparing temporary version-bumped workspace: $workspace_root"
    cp -a "$ROOT_DIR/." "$workspace_root/"
    echo "Applying planned version bumps in temporary workspace for publish candidates: $BUMP_SCRIPT --targets-file $candidate_targets_file --apply"
    PI_NPM_PACKAGES_ROOT="$workspace_root" "$BUMP_SCRIPT" --targets-file "$candidate_targets_file" --apply
    echo

    cmd=("$PUBLISH_SCRIPT" --targets-file "$candidate_targets_file" --publisher "$PUBLISHER" --access "$ACCESS")
    if [[ $STRICT_AUTH -eq 1 ]]; then
      cmd+=(--strict-auth)
    fi
    echo "Running publish plan for preselected targets against version-bumped temp workspace: ${cmd[*]}"
    PI_NPM_PACKAGES_ROOT="$workspace_root" "${cmd[@]}"
    ;;

  publish)
    bump_cmd=("$BUMP_SCRIPT" --target "$TARGET" --apply)
    echo "Applying required version bumps: ${bump_cmd[*]}"
    "${bump_cmd[@]}"
    echo

    cmd=("$PUBLISH_SCRIPT" --target "$TARGET" --publisher "$PUBLISHER" --access "$ACCESS" --apply)
    if [[ $STRICT_AUTH -eq 1 ]]; then
      cmd+=(--strict-auth)
    fi
    echo "Running: ${cmd[*]}"
    exec "${cmd[@]}"
    ;;
esac
