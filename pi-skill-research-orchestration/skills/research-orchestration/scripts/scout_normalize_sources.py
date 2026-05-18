#!/usr/bin/env python3
"""Normalize and sort research sources for dedupe-friendly tables.

Exit codes:
  0  Success
  1  Invalid input or IO error
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

_SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(_SCRIPTS / "_lib"))
import normalize as nlib  # noqa: E402


def _load_policy(path: Path | None) -> dict:
    p = path or (_SCRIPTS / "policy.json")
    if not p.exists():
        print(json.dumps({"error": "policy_missing", "path": str(p)}), file=sys.stderr)
        sys.exit(1)
    return json.loads(p.read_text(encoding="utf-8"))


def _parse_year(v) -> int | None:
    if v is None or v == "":
        return None
    if isinstance(v, int):
        return v
    s = str(v).strip()
    m = re.match(r"^(\d{4})", s)
    if m:
        return int(m.group(1))
    return None


def _official_rank(host: str, suffixes: list[str]) -> int:
    h = host.lower()
    for suf in suffixes or []:
        if h == suf.lower() or h.endswith("." + suf.lower()):
            return 0
    return 1


def _sort_key(row: dict, policy: dict) -> tuple:
    src = policy.get("sources") or {}
    suffixes = list(src.get("official_host_suffixes") or [])
    parsed = urlparse(row.get("normalized_url") or "")
    host = parsed.netloc.lower()
    path = parsed.path or ""
    rank = _official_rank(host, suffixes)
    return (rank, host, path, row.get("title") or "")


def load_sources_json(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "sources" in data:
        data = data["sources"]
    if not isinstance(data, list):
        raise ValueError("JSON must be a list of sources or an object with key 'sources'")
    return data


def parse_markdown_table(text: str) -> list[dict]:
    """Best-effort: rows with | and an http(s) URL in any cell."""
    rows: list[dict] = []
    for line in text.splitlines():
        line = line.strip()
        if "|" not in line or line.startswith("|---"):
            continue
        cells = [c.strip() for c in line.split("|")]
        cells = [c for c in cells if c]
        url = None
        title = ""
        for c in cells:
            if re.search(r"https?://\S+", c):
                m = re.search(r"(https?://[^\s`|]+)", c)
                if m:
                    url = m.group(1).rstrip(").,]")
            elif c and not url:
                title = c
        if url:
            rows.append({"title": title or url, "url": url})
    return rows


def normalize_sources(raw: list[dict], policy: dict) -> list[dict]:
    src_cfg = policy.get("sources") or {}
    params = list(src_cfg.get("tracking_query_params") or [])
    strip_all = bool(src_cfg.get("strip_all_query"))

    enriched: list[dict] = []
    seen_dedupe: set[str] = set()

    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", item.get("name", ""))).strip()
        url = str(item.get("url", item.get("link", ""))).strip()
        year = _parse_year(item.get("year", item.get("date")))
        if strip_all:
            norm_url = nlib.normalize_url_strip_all_query(url)
        else:
            norm_url = nlib.normalize_url(url, params)
        dk = nlib.dedupe_key(title, norm_url or url, year)
        if dk in seen_dedupe:
            continue
        seen_dedupe.add(dk)
        row = {
            "source_index": i,
            "title": title,
            "url": url,
            "normalized_url": norm_url,
            "dedupe_key": dk,
        }
        if year is not None:
            row["year"] = year
        enriched.append(row)

    enriched.sort(key=lambda r: _sort_key(r, policy))
    return enriched


def main() -> None:
    parser = argparse.ArgumentParser(description="Scout source URL normalizer")
    parser.add_argument("--input", type=Path, required=True, help="JSON file or .md with table")
    parser.add_argument("--policy", type=Path, help="Override policy.json")
    parser.add_argument("-o", "--output", type=Path, help="Write JSON to file")
    args = parser.parse_args()

    policy = _load_policy(args.policy)
    text = args.input.read_text(encoding="utf-8")
    suffix = args.input.suffix.lower()
    try:
        if suffix == ".md" or suffix == ".markdown":
            raw = parse_markdown_table(text)
        else:
            raw = load_sources_json(args.input)
    except (json.JSONDecodeError, ValueError) as e:
        print(json.dumps({"error": "parse_failed", "message": str(e)}), file=sys.stderr)
        sys.exit(1)

    out = {
        "schema": "scout_normalized_sources",
        "policy_version": policy.get("policy_version", ""),
        "sources": normalize_sources(raw, policy),
    }
    out_text = json.dumps(out, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(out_text, encoding="utf-8")
    sys.stdout.write(out_text)


if __name__ == "__main__":
    main()
