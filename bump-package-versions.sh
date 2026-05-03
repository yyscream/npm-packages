#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="all"
APPLY=0

usage() {
  cat <<'EOF'
Usage:
  ./bump-package-versions.sh [options]
  ./bump-package-versions.sh [package-dir-name]

Options:
  --target <name|all>   Process one package dir or all (default: all)
  --all                 Same as --target all
  --apply               Write bumped versions to package.json (default: plan only)
  -h, --help            Show help

Rules:
  - Check currently published npm version first.
  - For already-published packages, enforce local version == npm_latest + 1 patch.
  - If local is too high, reduce it back to npm_latest + 1 patch.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --all)
      TARGET="all"
      shift
      ;;
    --apply)
      APPLY=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --*)
      echo "ERROR: unknown option '$1'" >&2
      usage
      exit 1
      ;;
    *)
      if [[ "$TARGET" != "all" ]]; then
        echo "ERROR: multiple positional targets provided: '$TARGET' and '$1'" >&2
        exit 1
      fi
      TARGET="$1"
      shift
      ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required but not found in PATH." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is required but not found in PATH." >&2
  exit 1
fi

gather_packages() {
  if [[ "$TARGET" != "all" ]]; then
    if [[ -d "$ROOT_DIR/$TARGET" && -f "$ROOT_DIR/$TARGET/package.json" ]]; then
      printf "%s\n" "$ROOT_DIR/$TARGET"
      return
    fi
    echo "ERROR: package '$TARGET' not found under $ROOT_DIR" >&2
    exit 1
  fi

  find "$ROOT_DIR" -mindepth 1 -maxdepth 1 -type d \
    ! -name ".*" \
    -exec test -f "{}/package.json" ';' -print | sort
}

npm_latest_version() {
  local pkg_name="$1"
  local out
  if ! out="$(npm view "$pkg_name" version --json 2>/dev/null)"; then
    echo ""
    return 0
  fi

  node -e '
const raw = process.argv[1];
try {
  const v = JSON.parse(raw);
  if (Array.isArray(v)) {
    process.stdout.write(String(v[v.length - 1] ?? ""));
  } else {
    process.stdout.write(String(v ?? ""));
  }
} catch {
  process.stdout.write("");
}
' "$out"
}

semver_cmp() {
  local a="$1"
  local b="$2"
  node -e '
const [a,b] = process.argv.slice(1);
const parse = (v) => {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};
const pa = parse(a);
const pb = parse(b);
if (!pa || !pb) process.exit(2);
for (let i=0; i<3; i++) {
  if (pa[i] > pb[i]) { console.log(1); process.exit(0); }
  if (pa[i] < pb[i]) { console.log(-1); process.exit(0); }
}
console.log(0);
' "$a" "$b"
}

next_patch() {
  local version="$1"
  node -e '
const v = process.argv[1];
const m = v.match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!m) process.exit(2);
console.log(`${m[1]}.${m[2]}.${Number(m[3]) + 1}`);
' "$version"
}

set_package_version() {
  local pkg_json="$1"
  local next_version="$2"
  node -e '
const fs = require("fs");
const file = process.argv[1];
const nextVersion = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, "utf8"));
data.version = nextVersion;
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
' "$pkg_json" "$next_version"
}

mapfile -t PACKAGE_DIRS < <(gather_packages)
if [[ ${#PACKAGE_DIRS[@]} -eq 0 ]]; then
  echo "No packages found under $ROOT_DIR" >&2
  exit 1
fi

echo "Mode: $([[ $APPLY -eq 1 ]] && echo "apply" || echo "plan")"
echo

UPDATED_UP=0
UPDATED_DOWN=0
UNCHANGED=0
FIRST_RELEASE=0
ERRORS=0

for pkg_dir in "${PACKAGE_DIRS[@]}"; do
  pkg_json="$pkg_dir/package.json"

  if ! node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$pkg_json" >/dev/null 2>&1; then
    echo "==> $(basename "$pkg_dir"): ERROR invalid package.json"
    ERRORS=$((ERRORS+1))
    echo
    continue
  fi

  name="$(node -e 'const p=require(process.argv[1]); process.stdout.write(p.name||"")' "$pkg_json" 2>/dev/null || true)"
  local_version="$(node -e 'const p=require(process.argv[1]); process.stdout.write(p.version||"")' "$pkg_json" 2>/dev/null || true)"

  echo "==> $(basename "$pkg_dir")"
  echo "  - package: ${name:-<missing>}"
  echo "  - local version: ${local_version:-<missing>}"

  if [[ -z "$name" || -z "$local_version" ]]; then
    echo "  - action: ERROR missing name/version"
    ERRORS=$((ERRORS+1))
    echo
    continue
  fi

  npm_version="$(npm_latest_version "$name")"
  if [[ -z "$npm_version" ]]; then
    echo "  - npm version: <not published>"
    echo "  - action: no bump (first release)"
    FIRST_RELEASE=$((FIRST_RELEASE+1))
    UNCHANGED=$((UNCHANGED+1))
    echo
    continue
  fi

  echo "  - npm version: $npm_version"

  cmp="$(semver_cmp "$local_version" "$npm_version" 2>/dev/null || true)"
  if [[ -z "$cmp" ]]; then
    echo "  - action: ERROR non-semver version (expected x.y.z)"
    ERRORS=$((ERRORS+1))
    echo
    continue
  fi

  target_version="$(next_patch "$npm_version")"
  target_cmp="$(semver_cmp "$local_version" "$target_version" 2>/dev/null || true)"
  if [[ -z "$target_cmp" ]]; then
    echo "  - action: ERROR non-semver comparison for target version"
    ERRORS=$((ERRORS+1))
    echo
    continue
  fi

  echo "  - enforced target: $target_version (npm +1 patch)"

  if [[ "$target_cmp" == "0" ]]; then
    echo "  - action: unchanged (already at enforced target)"
    UNCHANGED=$((UNCHANGED+1))
    echo
    continue
  fi

  if [[ "$target_cmp" == "-1" ]]; then
    if [[ $APPLY -eq 1 ]]; then
      set_package_version "$pkg_json" "$target_version"
      echo "  - action: bumped up -> $target_version"
      UPDATED_UP=$((UPDATED_UP+1))
    else
      echo "  - action: would bump up -> $target_version"
      UPDATED_UP=$((UPDATED_UP+1))
    fi
    echo
    continue
  fi

  if [[ "$target_cmp" == "1" ]]; then
    if [[ $APPLY -eq 1 ]]; then
      set_package_version "$pkg_json" "$target_version"
      echo "  - action: reduced down -> $target_version (local was too high)"
      UPDATED_DOWN=$((UPDATED_DOWN+1))
    else
      echo "  - action: would reduce down -> $target_version (local is too high)"
      UPDATED_DOWN=$((UPDATED_DOWN+1))
    fi
    echo
    continue
  fi

done

echo "Summary:"
echo "  - $([[ $APPLY -eq 1 ]] && echo "bumped up" || echo "would bump up"): $UPDATED_UP"
echo "  - $([[ $APPLY -eq 1 ]] && echo "reduced down" || echo "would reduce down"): $UPDATED_DOWN"
echo "  - unchanged: $UNCHANGED"
echo "  - first release (no npm version): $FIRST_RELEASE"
echo "  - errors: $ERRORS"

if [[ $ERRORS -gt 0 ]]; then
  exit 1
fi
