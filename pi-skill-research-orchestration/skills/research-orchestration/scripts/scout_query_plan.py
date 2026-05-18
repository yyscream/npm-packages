#!/usr/bin/env python3
"""Compile a deterministic web query plan from topic, task class, and optional facets.

Exit codes:
  0  Success
  1  Invalid input or policy error
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

_TASK_CLASSES = frozenset({"quick", "standard", "deep"})


def _scripts_dir() -> Path:
    return Path(__file__).resolve().parent


def _load_policy(path: Path | None) -> dict:
    p = path or (_scripts_dir() / "policy.json")
    if not p.exists():
        print(json.dumps({"error": "policy_missing", "path": str(p)}), file=sys.stderr)
        sys.exit(1)
    return json.loads(p.read_text(encoding="utf-8"))


def _load_facets(path: Path | None) -> dict:
    if not path:
        return {}
    if not path.exists():
        print(json.dumps({"error": "facets_missing", "path": str(path)}), file=sys.stderr)
        sys.exit(1)
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        print(json.dumps({"error": "facets_not_object"}), file=sys.stderr)
        sys.exit(1)
    return data


def _facet_values(facets: dict) -> list[str]:
    parts: list[str] = []
    for key in ("candidates", "axes", "constraints"):
        raw = facets.get(key) or []
        if isinstance(raw, list):
            parts.extend(str(x).strip() for x in raw if str(x).strip())
    return sorted(set(parts))


def _forbidden(q: str, patterns: list[str]) -> bool:
    low = q.lower()
    return any(p.lower() in low for p in (patterns or []) if p)


def _expand_template(tpl: str, topic: str, facet: str | None) -> str:
    out = tpl.replace("{topic}", topic.strip())
    if facet is not None:
        out = out.replace("{facet}", facet)
    return " ".join(out.split())


def _plan_hash(topic: str, task_class: str, queries: list[dict]) -> str:
    payload = {
        "topic": topic.strip(),
        "task_class": task_class,
        "queries": [{"q": r["query"]} for r in queries],
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def build_plan(topic: str, task_class: str, facets: dict, policy: dict) -> dict:
    qp = policy.get("query_plan") or {}
    max_map = qp.get("max_queries") or {}
    cap = int(max_map.get(task_class, max_map.get("standard", 12)))
    forbidden = list(qp.get("forbidden_substrings") or [])
    templates = qp.get("templates") or []
    facet_list = _facet_values(facets)

    rows: list[dict] = []
    seen: set[str] = set()

    for t in templates:
        if len(rows) >= cap:
            break
        if not isinstance(t, dict):
            continue
        tpl = str(t.get("template", "")).strip()
        if not tpl:
            continue
        rationale = str(t.get("rationale", ""))
        requires = bool(t.get("requires_facet"))

        if requires:
            if not facet_list:
                continue
            for facet in facet_list:
                if len(rows) >= cap:
                    break
                q = _expand_template(tpl, topic, facet)
                if _forbidden(q, forbidden):
                    continue
                if q.lower() in seen:
                    continue
                seen.add(q.lower())
                rows.append({"query": q, "rationale": rationale, "facet": facet})
        else:
            q = _expand_template(tpl, topic, "")
            q = q.replace("{facet}", "").strip()
            q = re.sub(r"\s+", " ", q)
            if _forbidden(q, forbidden):
                continue
            if q.lower() in seen:
                continue
            seen.add(q.lower())
            rows.append({"query": q, "rationale": rationale})

    # Stable IDs in emission order
    out_rows = []
    for i, r in enumerate(rows[:cap]):
        out_rows.append(
            {
                "id": f"Q{i + 1:03d}",
                "query": r["query"],
                "rationale": r.get("rationale", ""),
                **({"facet": r["facet"]} if "facet" in r else {}),
            }
        )

    ph = _plan_hash(topic, task_class, out_rows)
    return {
        "schema": "scout_query_plan",
        "policy_version": policy.get("policy_version", ""),
        "topic": topic.strip(),
        "task_class": task_class,
        "cap": cap,
        "plan_hash": ph,
        "queries": out_rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Scout deterministic query plan compiler")
    parser.add_argument("--topic", required=True, help="Research topic string")
    parser.add_argument(
        "--task-class",
        required=True,
        choices=sorted(_TASK_CLASSES),
        help="quick | standard | deep",
    )
    parser.add_argument("--facets", type=Path, help="JSON file: candidates, axes, constraints")
    parser.add_argument("--policy", type=Path, help="Override policy.json path")
    parser.add_argument("-o", "--output", type=Path, help="Write JSON to file")
    args = parser.parse_args()

    policy = _load_policy(args.policy)
    facets = _load_facets(args.facets)
    doc = build_plan(args.topic, args.task_class, facets, policy)
    text = json.dumps(doc, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8")
    sys.stdout.write(text)


if __name__ == "__main__":
    main()
