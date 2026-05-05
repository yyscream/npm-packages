#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MODE=""
TARGET="all"
PUBLISHER="auto"
ACCESS="public"
CHECK_ALT_CLIENT=0
STRICT_AUTH=1

usage() {
  cat <<'EOF'
Usage:
  ./release-workflow.sh <--check|--plan|--publish> [options]

Modes (choose exactly one):
  --check      Run pre-publish readiness checks only
  --plan       Run publish planning/checks only (no publish)
  --publish    Run full checks and publish; failures are handled per package

Options:
  --target <name|all>          Target one package directory or all (default: all)
  --all                        Same as --target all
  --publisher <auto|bun|npm>   Publisher client (default: auto)
  --access <public|restricted> Publish access for --publish/--plan (default: public)
  --check-alt-client           For --check: also dry-run with alternate client
  --no-strict-auth             For --publish/--plan: disable strict auth
  -h, --help                   Show help

Examples:
  ./release-workflow.sh --check --all
  ./release-workflow.sh --plan --target pi-extension-notes
  ./release-workflow.sh --publish --all --publisher auto
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

CHECK_SCRIPT="$ROOT_DIR/check-publish-readiness.sh"
PUBLISH_SCRIPT="$ROOT_DIR/publish-packages.sh"

if [[ ! -x "$CHECK_SCRIPT" ]]; then
  echo "ERROR: missing executable $CHECK_SCRIPT" >&2
  exit 1
fi
if [[ ! -x "$PUBLISH_SCRIPT" ]]; then
  echo "ERROR: missing executable $PUBLISH_SCRIPT" >&2
  exit 1
fi

case "$MODE" in
  check)
    cmd=("$CHECK_SCRIPT" --target "$TARGET" --publisher "$PUBLISHER")
    if [[ $CHECK_ALT_CLIENT -eq 1 ]]; then
      cmd+=(--check-alt-client)
    fi
    echo "Running: ${cmd[*]}"
    exec "${cmd[@]}"
    ;;

  plan)
    cmd=("$PUBLISH_SCRIPT" --target "$TARGET" --publisher "$PUBLISHER" --access "$ACCESS")
    if [[ $STRICT_AUTH -eq 1 ]]; then
      cmd+=(--strict-auth)
    fi
    echo "Running: ${cmd[*]}"
    exec "${cmd[@]}"
    ;;

  publish)
    cmd=("$PUBLISH_SCRIPT" --target "$TARGET" --publisher "$PUBLISHER" --access "$ACCESS" --apply)
    if [[ $STRICT_AUTH -eq 1 ]]; then
      cmd+=(--strict-auth)
    fi
    echo "Running: ${cmd[*]}"
    exec "${cmd[@]}"
    ;;
esac
