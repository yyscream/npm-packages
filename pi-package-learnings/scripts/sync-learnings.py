#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(os.environ.get("LEARNINGS_DIR", Path(__file__).parent))
ARCHIVE = ROOT / "archive"
IGNORE_NAMES = {
    "README.md",
    "INDEX.md",
    "LEARNINGS-SUMMARY.md",
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def archive_name(path: Path) -> str:
    digest = sha256(path)[:12]
    return f"{path.stem}-{digest}{path.suffix}"


def main() -> int:
    ROOT.mkdir(parents=True, exist_ok=True)
    ARCHIVE.mkdir(parents=True, exist_ok=True)

    entries = []
    for path in sorted(ROOT.glob("*.md")):
        if path.name in IGNORE_NAMES:
            continue
        target = ARCHIVE / archive_name(path)
        shutil.copy2(path, target)
        rel = str(path.relative_to(ROOT))
        arel = str(target.relative_to(ROOT))
        entries.append({
            "title": path.stem,
            "source": rel,
            "archive": arel,
            "sha256": sha256(path),
            "bytes": path.stat().st_size,
            "mtime": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
        })

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "root": str(ROOT),
        "entries": entries,
    }
    (ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")

    lines = ["# LEARNINGS Index", "", f"Generated: {manifest['generated_at']}", "", f"Entries: {len(entries)}", ""]
    for e in entries:
        lines.append(f"- [{e['title']}]({e['archive']}) — source: `{e['source']}`")
    (ROOT / "INDEX.md").write_text("\n".join(lines) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
