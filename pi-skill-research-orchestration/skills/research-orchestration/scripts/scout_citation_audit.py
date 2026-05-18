#!/usr/bin/env python3
"""Verify each key finding cites a source or is explicitly exempt.

Exit codes:
  0  All findings covered or exempt
  1  Violations or invalid input
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


def _load_policy(path: Path | None, scripts_dir: Path) -> dict:
    p = path or (scripts_dir / "policy.json")
    if not p.exists():
        print(json.dumps({"error": "policy_missing", "path": str(p)}), file=sys.stderr)
        sys.exit(1)
    return json.loads(p.read_text(encoding="utf-8"))


def _extract_json_fence(text: str) -> dict | None:
    for m in re.finditer(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE):
        block = m.group(1).strip()
        if not block:
            continue
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and ("key_findings" in data or "sources" in data):
            return data
    return None


def _load_report(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    suffix = path.suffix.lower()
    if suffix in (".json",):
        return json.loads(text)
    data = _extract_json_fence(text)
    if data is not None:
        return data
    print(
        json.dumps(
            {
                "error": "no_citation_json",
                "message": "Markdown must contain a fenced ```json block with key_findings / sources",
            }
        ),
        file=sys.stderr,
    )
    sys.exit(1)


def _finding_status(f: dict, exempt: set[str]) -> str | None:
    st = f.get("status")
    if isinstance(st, str) and st.lower() in exempt:
        return st.lower()
    tags = f.get("tags")
    if isinstance(tags, list):
        for t in tags:
            if isinstance(t, str) and t.lower() in exempt:
                return t.lower()
    return None


def audit(data: dict, policy: dict) -> tuple[list[dict], list[str]]:
    ca = policy.get("citation_audit") or {}
    exempt = {x.lower() for x in (ca.get("exempt_statuses") or ["unsupported", "inferential"])}

    findings = data.get("key_findings")
    sources = data.get("sources")
    sources_key_present = "sources" in data
    if findings is None:
        return [], ["missing_key_findings"]
    if not isinstance(findings, list):
        return [], ["key_findings_not_array"]
    if sources_key_present and not isinstance(sources, list):
        return [], ["sources_not_array"]

    source_ids: set[str] = set()
    if isinstance(sources, list):
        for s in sources:
            if isinstance(s, dict) and s.get("id") is not None:
                source_ids.add(str(s["id"]))

    violations: list[dict] = []
    for f in findings:
        if not isinstance(f, dict):
            violations.append({"finding_id": "_invalid", "reason": "finding_not_object"})
            continue
        fid = str(f.get("id", f.get("finding_id", ""))).strip() or "_missing_id"
        if _finding_status(f, exempt):
            continue
        sids = f.get("source_ids")
        if not isinstance(sids, list):
            sids = []
        sids_str = [str(x) for x in sids if x is not None and str(x).strip()]
        if not sids_str:
            violations.append({"finding_id": fid, "reason": "no_source_ids"})
            continue
        if not sources_key_present:
            violations.append(
                {
                    "finding_id": fid,
                    "reason": "sources_required_for_citations",
                }
            )
            continue
        missing = [s for s in sids_str if s not in source_ids]
        if missing:
            violations.append(
                {
                    "finding_id": fid,
                    "reason": "unknown_source_id",
                    "unknown": missing,
                }
            )

    violations.sort(key=lambda v: v.get("finding_id", ""))
    return violations, []


def main() -> None:
    scripts_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Scout claim–source citation audit")
    parser.add_argument(
        "--report",
        type=Path,
        help="Single JSON or Markdown file with optional fenced JSON",
    )
    parser.add_argument("--findings", type=Path, help="JSON with key_findings[]")
    parser.add_argument("--sources", type=Path, help="JSON with sources[] (optional)")
    parser.add_argument("--policy", type=Path, help="Override policy.json")
    args = parser.parse_args()

    if not args.report and not args.findings:
        print(json.dumps({"error": "need_report_or_findings"}), file=sys.stderr)
        sys.exit(1)

    policy = _load_policy(args.policy, scripts_dir)

    if args.report:
        data = _load_report(args.report)
    else:
        data = json.loads(args.findings.read_text(encoding="utf-8"))
        if args.sources:
            src = json.loads(args.sources.read_text(encoding="utf-8"))
            if isinstance(src, list):
                data = {**data, "sources": src}
            elif isinstance(src, dict) and "sources" in src:
                data = {**data, "sources": src["sources"]}

    violations, structural = audit(data, policy)
    if structural:
        print(json.dumps({"ok": False, "structural_errors": structural}, indent=2), file=sys.stderr)
        sys.exit(1)

    if violations:
        out = {"ok": False, "violations": violations}
        print(json.dumps(out, indent=2, ensure_ascii=False))
        sys.exit(1)

    print(json.dumps({"ok": True, "violations": []}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
