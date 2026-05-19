#!/usr/bin/env bash
set -euo pipefail
ROOT="${LEARNINGS_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/latest.log"
{
  echo "[$(date --iso-8601=seconds)] LEARNINGS sync start: $ROOT"
  "$ROOT/sync-learnings.py"
  "$ROOT/summarize-learnings.py"
  echo "[$(date --iso-8601=seconds)] LEARNINGS sync PASS"
} >"$LOG" 2>&1
if command -v notify-send >/dev/null 2>&1; then
  notify-send "LEARNINGS sync PASS" "$ROOT" >/dev/null 2>&1 || true
fi
