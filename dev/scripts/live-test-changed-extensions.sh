#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${PI_NPM_PACKAGES_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd -P)}"
PI_BIN="${PI_BIN:-pi}"
PI_GLOBAL_ROOT="${PI_GLOBAL_ROOT:-$(npm root -g 2>/dev/null || true)}"
PI_AGENT_PKG="${PI_AGENT_PKG:-$PI_GLOBAL_ROOT/@earendil-works/pi-coding-agent}"
KEEP_TMP=0
RUN_NEWS_NETWORK=0

usage() {
  cat <<'EOF'
Usage:
  ./dev/scripts/live-test-changed-extensions.sh [options]

Options:
  --keep-tmp           Keep the temporary live-test workspace for inspection.
  --news-network       Also run /news 1 against live network sources (default only /news-setup).
  -h, --help           Show this help.

Environment overrides:
  PI_BIN               Pi executable to use (default: pi)
  PI_GLOBAL_ROOT       Global npm root containing @earendil-works packages
  PI_AGENT_PKG         Path to @earendil-works/pi-coding-agent

What it tests:
  - Creates an isolated temp PI_CODING_AGENT_DIR.
  - Symlinks local ./pi-utils as @firstpick/pi-utils.
  - Loads each changed extension through the real pi CLI with -e.
  - Runs representative slash commands.
  - Loads all changed extensions together and verifies registered commands/tools.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep-tmp)
      KEEP_TMP=1
      shift
      ;;
    --news-network)
      RUN_NEWS_NETWORK=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown option '$1'" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v "$PI_BIN" >/dev/null 2>&1; then
  echo "ERROR: Pi executable not found: $PI_BIN" >&2
  exit 1
fi

if [[ -z "$PI_GLOBAL_ROOT" || ! -d "$PI_AGENT_PKG" ]]; then
  echo "ERROR: Could not locate @earendil-works/pi-coding-agent." >&2
  echo "Set PI_AGENT_PKG=/path/to/@earendil-works/pi-coding-agent" >&2
  exit 1
fi

for dir in \
  pi-utils \
  pi-extension-brave-search \
  pi-extension-git-footer-status \
  pi-extension-notes \
  pi-extension-plan-executor \
  pi-extension-plan-mode-toggle \
  pi-extension-stats \
  pi-extension-tech-news \
  pi-extension-upgrade-extensions; do
  if [[ ! -f "$ROOT_DIR/$dir/index.ts" ]]; then
    echo "ERROR: missing $dir/index.ts" >&2
    exit 1
  fi
done

TMP_DIR="$(mktemp -d)"
cleanup() {
  if [[ "$KEEP_TMP" -eq 1 ]]; then
    echo "Keeping temp workspace: $TMP_DIR"
  else
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

mkdir -p "$TMP_DIR/node_modules/@firstpick" "$TMP_DIR/node_modules/@earendil-works"
ln -s "$ROOT_DIR/pi-utils" "$TMP_DIR/node_modules/@firstpick/pi-utils"
ln -s "$PI_AGENT_PKG" "$TMP_DIR/node_modules/@earendil-works/pi-coding-agent"

for dep in pi-tui pi-ai; do
  dep_path="$PI_AGENT_PKG/node_modules/@earendil-works/$dep"
  if [[ -d "$dep_path" ]]; then
    ln -s "$dep_path" "$TMP_DIR/node_modules/@earendil-works/$dep"
  fi
done

if [[ -d "$PI_AGENT_PKG/node_modules/typebox" ]]; then
  ln -s "$PI_AGENT_PKG/node_modules/typebox" "$TMP_DIR/node_modules/typebox"
fi

CHANGED_EXTENSIONS=(
  pi-extension-brave-search
  pi-extension-git-footer-status
  pi-extension-notes
  pi-extension-plan-executor
  pi-extension-plan-mode-toggle
  pi-extension-stats
  pi-extension-tech-news
  pi-extension-upgrade-extensions
)

cp -a "${CHANGED_EXTENSIONS[@]/#/$ROOT_DIR/}" "$TMP_DIR/"

run_pi() {
  local label="$1"
  local ext="$2"
  local prompt="$3"
  local setup_cmd="${4:-:}"
  local work="$TMP_DIR/cases/${ext}-${label//[^A-Za-z0-9_.-]/_}"
  mkdir -p "$work"
  cp -a "$TMP_DIR/node_modules" "$work/node_modules"
  cp -a "$TMP_DIR/$ext" "$work/$ext"
  mkdir -p "$work/agent"

  echo "==> $ext :: $prompt"
  (
    cd "$work"
    eval "$setup_cmd"
    PI_CODING_AGENT_DIR="$work/agent" PI_OFFLINE=1 "$PI_BIN" --no-extensions -e "$work/$ext/index.ts" --no-session -p "$prompt" >out.txt 2>err.txt
  )

  if [[ -s "$work/out.txt" ]]; then sed 's/^/  out: /' "$work/out.txt" | head -40; fi
  if [[ -s "$work/err.txt" ]]; then sed 's/^/  err: /' "$work/err.txt" | head -40; fi

  case "$ext:$prompt" in
    "pi-extension-notes:/note live-test :: shared slugify smoke")
      test -f "$work/agent/memory/notes/live-test.md"
      grep -q 'shared slugify smoke' "$work/agent/memory/notes/live-test.md"
      grep -q '"slug": "live-test"' "$work/agent/memory/notes/index.json"
      ;;
  esac
}

run_registration_smoke() {
  local work="$TMP_DIR/registration"
  mkdir -p "$work"
  cp -a "$TMP_DIR/node_modules" "$work/node_modules"
  cp -a "${CHANGED_EXTENSIONS[@]/#/$TMP_DIR/}" "$work/"
  mkdir -p "$work/agent"

  cat > "$work/harness.ts" <<'TS'
import { writeFileSync } from "node:fs";
export default function(pi: any) {
  pi.on("session_start", async () => {
    writeFileSync(process.env.PI_LIVE_TEST_OUT!, JSON.stringify({
      commands: pi.getCommands().filter((c: any) => c.source === "extension").map((c: any) => c.name).sort(),
      tools: pi.getAllTools().filter((t: any) => t.sourceInfo?.source !== "builtin" && t.sourceInfo?.source !== "sdk").map((t: any) => t.name).sort(),
    }, null, 2));
  });
}
TS

  echo "==> combined registration smoke"
  (
    cd "$work"
    PI_CODING_AGENT_DIR="$work/agent" PI_OFFLINE=1 PI_LIVE_TEST_OUT="$work/out.json" "$PI_BIN" --no-extensions \
      -e "$work/pi-extension-brave-search/index.ts" \
      -e "$work/pi-extension-git-footer-status/index.ts" \
      -e "$work/pi-extension-notes/index.ts" \
      -e "$work/pi-extension-plan-executor/index.ts" \
      -e "$work/pi-extension-plan-mode-toggle/index.ts" \
      -e "$work/pi-extension-stats/index.ts" \
      -e "$work/pi-extension-tech-news/index.ts" \
      -e "$work/pi-extension-upgrade-extensions/index.ts" \
      -e "$work/harness.ts" --no-session -p 'registration smoke' >pi.out 2>pi.err || true
  )

  test -f "$work/out.json"
  node - "$work/out.json" <<'NODE'
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const requiredCommands = [
  'brave-search-status', 'brave-search-setup',
  'git-footer-refresh',
  'note', 'note-list', 'note-read', 'note-update', 'note-delete', 'note-status',
  'execute-plan', 'stop-plan', 'plan-status',
  'plan-mode', 'plan-model',
  'stats', 'stats-pi', 'stats-tokens',
  'news', 'news-sec', 'news-setup',
  'extensions-update',
];
const requiredTools = [
  'brave_search',
  'note_list', 'note_read', 'note_update', 'note_delete',
  'start_plan_executor', 'stop_plan_executor', 'plan_executor_status',
  'news_feed', 'news_sec',
];
const missingCommands = requiredCommands.filter((name) => !data.commands.includes(name));
const missingTools = requiredTools.filter((name) => !data.tools.includes(name));
if (missingCommands.length || missingTools.length) {
  console.error('Missing commands:', missingCommands.join(', ') || 'none');
  console.error('Missing tools:', missingTools.join(', ') || 'none');
  process.exit(1);
}
console.log(`  commands: ${data.commands.length} registered`);
console.log(`  tools: ${data.tools.length} registered`);
NODE
}

run_pi "status" pi-extension-brave-search "/brave-search-status"
run_pi "refresh" pi-extension-git-footer-status "/git-footer-refresh"
run_pi "create-note" pi-extension-notes "/note live-test :: shared slugify smoke"
run_pi "status" pi-extension-plan-executor "/plan-status"
run_pi "enable" pi-extension-plan-mode-toggle "/plan-mode on"
run_pi "stats-pi" pi-extension-stats "/stats-pi"
run_pi "setup" pi-extension-tech-news "/news-setup"
run_pi "empty-settings" pi-extension-upgrade-extensions "/extensions-update" 'echo "{\"packages\":[]}" > agent/settings.json'

if [[ "$RUN_NEWS_NETWORK" -eq 1 ]]; then
  # Uses live public feeds and may fail if offline or rate-limited.
  run_pi "network-news" pi-extension-tech-news "/news 1 hn" ''
fi

run_registration_smoke

echo "PASS: live Pi extension smoke tests completed."
