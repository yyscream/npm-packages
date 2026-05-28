#!/usr/bin/env python3
"""Incrementally refresh a persistent repo index.

Compares file mtimes and hashes against the existing index and only
re-scans files that have changed, been added, or removed.

Usage:
    python3 refresh_repo_index.py --repo /path/to/repo --data-dir data/

Exit codes:
    0 — index is fresh or was refreshed successfully
    1 — no existing index found (caller should run build_repo_index.py)
    2 — error during refresh
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

STALE_THRESHOLD_SECONDS = 86400  # 24 hours

script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))
from build_repo_index import (
    scan_repo,
    should_skip_dir,
    should_skip_file,
    detect_language,
    count_lines,
    file_hash,
    classify_role,
    extract_symbols,
    is_sensitive_file,
)


def find_index(data_dir: Path, repo_path: Path) -> Path | None:
    repo_name = repo_path.name
    candidates = [
        data_dir / f"{repo_name}-index.json",
        data_dir / f"{repo_name}.json",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate

    for f in data_dir.glob("*-index.json"):
        try:
            idx = json.loads(f.read_text(encoding="utf-8"))
            if idx.get("repo_path") == str(repo_path):
                return f
        except (json.JSONDecodeError, OSError):
            continue
    return None


def load_index(index_path: Path) -> dict:
    return json.loads(index_path.read_text(encoding="utf-8"))


def index_age_seconds(index: dict) -> float:
    built_at = index.get("built_at", "")
    if not built_at:
        return float("inf")
    try:
        built_dt = datetime.fromisoformat(built_at)
        return (datetime.now(timezone.utc) - built_dt).total_seconds()
    except ValueError:
        return float("inf")


def refresh_index(repo_path: Path, existing_index: dict) -> dict:
    old_files_by_path = {}
    for f in existing_index.get("files", []):
        old_files_by_path[f["path"]] = f

    current_paths = set()
    updated_files = []
    changed_count = 0
    added_count = 0
    removed_count = 0
    language_stats = {}
    role_stats = {}

    for root, dirs, filenames in os.walk(repo_path, topdown=True):
        dirs[:] = [d for d in dirs if not should_skip_dir(d)]
        dirs.sort()

        for fname in sorted(filenames):
            fpath = Path(root) / fname
            if should_skip_file(fpath):
                continue

            abs_path = str(fpath)
            current_paths.add(abs_path)

            try:
                stat = fpath.stat()
            except (OSError, PermissionError):
                continue

            old_entry = old_files_by_path.get(abs_path)

            if old_entry and old_entry.get("mtime") == stat.st_mtime:
                updated_files.append(old_entry)
                lang = old_entry.get("language", "unknown")
                role = old_entry.get("role", "source")
            else:
                rel_path = str(fpath.relative_to(repo_path))
                language = detect_language(fpath)
                lines = count_lines(fpath)
                role = classify_role(fpath, rel_path)
                content_sensitive = is_sensitive_file(fpath)
                symbols = [] if content_sensitive else extract_symbols(fpath, language)

                entry = {
                    "path": abs_path,
                    "relative_path": rel_path,
                    "language": language,
                    "lines": lines,
                    "size_bytes": stat.st_size,
                    "mtime": stat.st_mtime,
                    "hash": "" if content_sensitive else file_hash(fpath),
                    "role": role,
                }
                if content_sensitive:
                    entry["content_sensitive"] = True
                if symbols:
                    entry["symbols"] = symbols

                updated_files.append(entry)
                lang = language

                if old_entry:
                    changed_count += 1
                else:
                    added_count += 1

            language_stats[lang] = language_stats.get(lang, 0) + 1
            role_stats[role] = role_stats.get(role, 0) + 1

    old_paths = set(old_files_by_path.keys())
    removed_count = len(old_paths - current_paths)

    return {
        "schema_version": "1.0",
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "repo_path": str(repo_path),
        "repo_name": repo_path.name,
        "total_files": len(updated_files),
        "language_breakdown": dict(sorted(language_stats.items(), key=lambda x: -x[1])),
        "role_breakdown": dict(sorted(role_stats.items(), key=lambda x: -x[1])),
        "refresh_stats": {
            "added": added_count,
            "changed": changed_count,
            "removed": removed_count,
            "unchanged": len(updated_files) - changed_count - added_count,
        },
        "files": updated_files,
    }


def main():
    parser = argparse.ArgumentParser(description="Incrementally refresh repo index")
    parser.add_argument("--repo", required=True, help="Absolute path to repository root")
    parser.add_argument("--data-dir", required=True, help="Directory containing index files")
    parser.add_argument(
        "--force", action="store_true",
        help="Force rebuild even if index is fresh",
    )
    args = parser.parse_args()

    repo_path = Path(args.repo).resolve()
    data_dir = Path(args.data_dir).resolve()

    if not repo_path.is_dir():
        print(json.dumps({"error": f"Repository not found: {repo_path}"}), file=sys.stderr)
        sys.exit(2)

    index_path = find_index(data_dir, repo_path)

    if not index_path:
        print(json.dumps({
            "status": "no_index",
            "message": f"No index found for {repo_path}. Run build_repo_index.py first.",
        }))
        sys.exit(1)

    existing_index = load_index(index_path)
    age = index_age_seconds(existing_index)

    if not args.force and age < STALE_THRESHOLD_SECONDS:
        print(json.dumps({
            "status": "fresh",
            "index_path": str(index_path),
            "age_seconds": round(age),
            "files_indexed": existing_index.get("total_files", 0),
        }))
        sys.exit(0)

    new_index = refresh_index(repo_path, existing_index)
    index_path.write_text(json.dumps(new_index, indent=2, ensure_ascii=False), encoding="utf-8")

    stats = new_index.get("refresh_stats", {})
    print(json.dumps({
        "status": "refreshed",
        "index_path": str(index_path),
        "files_indexed": new_index["total_files"],
        "added": stats.get("added", 0),
        "changed": stats.get("changed", 0),
        "removed": stats.get("removed", 0),
        "unchanged": stats.get("unchanged", 0),
    }, indent=2))


if __name__ == "__main__":
    main()
