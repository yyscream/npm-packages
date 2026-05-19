#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(os.environ.get("LEARNINGS_DIR", Path(__file__).parent))
MANIFEST = ROOT / "manifest.json"
SUMMARY = ROOT / "LEARNINGS-SUMMARY.md"


def first_lines(path: Path, max_lines: int = 6) -> list[str]:
    out: list[str] = []
    for line in path.read_text(errors="replace").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        out.append(stripped)
        if len(out) >= max_lines:
            break
    return out


def main() -> int:
    if not MANIFEST.exists():
        raise SystemExit(f"Missing {MANIFEST}; run sync-learnings.py first")
    data = json.loads(MANIFEST.read_text())
    entries = data.get("entries", [])
    lines = [
        "# LEARNINGS Summary",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        f"Archive root: `{ROOT}`",
        f"Entries: {len(entries)}",
        "",
        "Use this file as a routing summary. For actual troubleshooting, read the referenced archive/source file before applying a lesson.",
        "",
    ]
    for e in entries:
        archive = e.get("archive", "")
        source = e.get("source", "")
        title = e.get("title", source)
        lines.append(f"## {title}")
        lines.append("")
        lines.append(f"- Source: `{source}`")
        lines.append(f"- Archive: `{archive}`")
        archive_path = ROOT / archive
        if archive and archive_path.exists():
            for item in first_lines(archive_path):
                lines.append(f"- {item}")
        lines.append("")
    SUMMARY.write_text("\n".join(lines).rstrip() + "\n")
    print(SUMMARY)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
