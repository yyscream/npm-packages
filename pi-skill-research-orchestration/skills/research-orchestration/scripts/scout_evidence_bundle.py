#!/usr/bin/env python3
"""Merge append-only fetch records into one canonical evidence bundle JSON.

Exit codes:
  0  Success
  1  Invalid input
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(_SCRIPTS / "_lib"))
import normalize as nlib  # noqa: E402


def _load_policy(path: Path | None) -> dict:
    p = path or (_SCRIPTS / "policy.json")
    if not p.exists():
        print(json.dumps({"error": "policy_missing", "path": str(p)}), file=sys.stderr)
        sys.exit(1)
    return json.loads(p.read_text(encoding="utf-8"))


def _sort_key(entry: dict) -> tuple:
    url = str(entry.get("normalized_url") or entry.get("url") or "")
    return (
        url,
        str(entry.get("fetched_at") or ""),
        str(entry.get("content_hash") or ""),
    )


def read_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError as e:
            print(
                json.dumps({"error": "jsonl_parse", "line": line_no, "message": str(e)}),
                file=sys.stderr,
            )
            sys.exit(1)
        if not isinstance(obj, dict):
            print(json.dumps({"error": "jsonl_not_object", "line": line_no}), file=sys.stderr)
            sys.exit(1)
        rows.append(obj)
    return rows


def build_bundle(records: list[dict], policy: dict) -> dict:
    eb = policy.get("evidence_bundle") or {}
    schema_version = str(eb.get("schema_version", "1.0.0"))
    sort_keys = bool(eb.get("json_sort_keys", True))
    src = policy.get("sources") or {}
    params = list(src.get("tracking_query_params") or [])
    strip_all = bool(src.get("strip_all_query"))

    norm_rows: list[dict] = []
    for r in records:
        url = str(r.get("url", "")).strip()
        if strip_all:
            nu = nlib.normalize_url_strip_all_query(url)
        else:
            nu = nlib.normalize_url(url, params)
        excerpt = r.get("excerpt")
        ex_norm = nlib.content_fingerprint(str(excerpt)) if excerpt is not None else ""
        row = {
            "url": url,
            "normalized_url": nu,
            "fetched_at": str(r.get("fetched_at", "")),
            "content_hash": str(r.get("content_hash", "")),
        }
        if excerpt is not None:
            row["excerpt_normalized"] = ex_norm
        norm_rows.append(row)

    norm_rows.sort(key=_sort_key)

    body_core = {
        "schema": "scout_evidence_bundle",
        "schema_version": schema_version,
        "policy_version": policy.get("policy_version", ""),
        "entries": norm_rows,
    }
    canonical = json.dumps(body_core, sort_keys=sort_keys, ensure_ascii=False, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return {**body_core, "content_sha256": digest}


def main() -> None:
    parser = argparse.ArgumentParser(description="Scout evidence bundle writer")
    parser.add_argument("--input", type=Path, required=True, help="Append-only JSONL path")
    parser.add_argument("--policy", type=Path, help="Override policy.json")
    parser.add_argument("-o", "--output", type=Path, required=True, help="Write evidence_bundle.json")
    args = parser.parse_args()

    if not args.input.exists():
        print(json.dumps({"error": "input_missing", "path": str(args.input)}), file=sys.stderr)
        sys.exit(1)

    policy = _load_policy(args.policy)
    records = read_jsonl(args.input)
    bundle = build_bundle(records, policy)
    text = json.dumps(bundle, indent=2, ensure_ascii=False) + "\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(text, encoding="utf-8")
    sys.stdout.write(text)


if __name__ == "__main__":
    main()
