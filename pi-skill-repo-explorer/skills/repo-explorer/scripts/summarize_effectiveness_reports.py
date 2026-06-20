#!/usr/bin/env python3
"""Summarize repo-explorer effectiveness reports into an improvement Markdown file.

The native repo_explorer_explore tool writes one
repo-explorer-effectiveness-*.md file per invocation. This helper reads those
reports, preserves compatibility with legacy report shapes, and emits a compact
improvement-oriented rollup.

Usage:
    python3 summarize_effectiveness_reports.py \
        --reports-dir skills/repo-explorer \
        --output skills/repo-explorer/repo-explorer-effectiveness-summary.md

If --output is omitted, the Markdown summary is written to stdout.
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

REPORT_GLOB = "repo-explorer-effectiveness-*.md"
REPORT_NAME_RE = re.compile(r"^repo-explorer-effectiveness-\d{4}-\d{2}-\d{2}T.*\.md$")

TRACE_TERMS = {
    "trace", "flow", "flows", "wiring", "wire", "dependency", "dependencies",
    "call", "calls", "route", "routes",
}


def strip_markup(value: str) -> str:
    value = value.strip()
    if value.startswith("`") and value.endswith("`"):
        value = value[1:-1]
    return value.strip()


def parse_int(value: str | None, default: int = 0) -> int:
    if value is None:
        return default
    match = re.search(r"-?\d+", str(value))
    return int(match.group(0)) if match else default


def classify_goal(goal: str) -> str:
    tokens = set(re.findall(r"[a-z0-9_]+", goal.lower()))
    if tokens & TRACE_TERMS:
        return "trace"
    if tokens & {"review", "audit", "evaluate", "check", "quality"}:
        return "review"
    if tokens & {"modify", "implement", "change", "fix", "add", "update"}:
        return "change-planning"
    if tokens & {"map", "structure", "architecture", "overview"}:
        return "mapping"
    if tokens & {"find", "locate", "where"}:
        return "lookup"
    return "general"


def section_bullets(text: str, section_name: str) -> list[str]:
    bullets: list[str] = []
    in_section = False
    for line in text.splitlines():
        if line.startswith("## "):
            in_section = line.strip() == f"## {section_name}"
            continue
        if in_section and line.startswith("- "):
            item = line[2:].strip()
            if item and item.lower() != "none":
                bullets.append(item)
    return bullets


def parse_report(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")
    fields: dict[str, str] = {}
    for line in text.splitlines():
        match = re.match(r"^- ([^:]+):\s*(.*)$", line)
        if match:
            fields[match.group(1).strip()] = strip_markup(match.group(2))

    signals = [item.split(":", 1)[0].strip() for item in section_bullets(text, "Improvement Signals")]
    if signals == ["None"]:
        signals = []

    errors_and_validation = section_bullets(text, "Errors and Validation")
    explorer_limitations = section_bullets(text, "Explorer Limitations")
    target_risks = section_bullets(text, "Target Repository Risks")
    legacy_risks = section_bullets(text, "Risks and Errors")

    # Backfill signals for older reports that predate explicit improvement tracking.
    legacy_lines = errors_and_validation + explorer_limitations + target_risks + legacy_risks
    if any("budget_exceeded" in item for item in legacy_lines):
        signals.append("legacy_budget_exceeded")
    if any("no_match" in item for item in legacy_lines):
        signals.append("no_match")
    if any("index_stale" in item for item in legacy_lines):
        signals.append("stale_index")
    if any("dependency_trace_empty" in item for item in legacy_lines):
        signals.append("dependency_trace_empty")
    if any("No test files found" in item for item in legacy_lines):
        signals.append("target_repo_no_tests")

    symbols_found = parse_int(fields.get("Relevant symbols found"))
    key_files_found = parse_int(fields.get("Key files found"))
    deps_found = parse_int(fields.get("Dependency edges found"))
    evidence_found = parse_int(fields.get("Evidence snippets collected"))
    symbols_omitted = parse_int(fields.get("Symbols omitted"))
    key_files_omitted = parse_int(fields.get("Key files omitted"))
    deps_omitted = parse_int(fields.get("Dependency edges omitted"))
    evidence_omitted = parse_int(fields.get("Evidence omitted"))

    if symbols_omitted > 0:
        signals.append("symbol_omission")
    if key_files_omitted > 0:
        signals.append("key_file_omission")
    if deps_omitted > 0:
        signals.append("dependency_omission")
    if evidence_omitted > 0:
        signals.append("evidence_omission")

    # Legacy saturation heuristics.
    if symbols_found >= 30 and symbols_omitted == 0:
        signals.append("legacy_symbol_saturation")
    if key_files_found >= 25 and key_files_omitted == 0:
        signals.append("legacy_key_file_saturation")
    if fields.get("Evidence requested in tool output") == "no" and evidence_found > 0:
        signals.append("legacy_evidence_collected_when_not_requested")

    goal = fields.get("Goal", "")
    goal_category = fields.get("Goal category") or classify_goal(goal)
    if goal_category == "trace" and deps_found == 0:
        signals.append("trace_goal_zero_dependencies")

    return {
        "file": path.name,
        "generated": fields.get("Generated", ""),
        "status": fields.get("Status", "unknown"),
        "assessment": fields.get("Assessment", "unknown"),
        "validation": fields.get("Handoff validation", "unknown"),
        "target_path": fields.get("Target path", ""),
        "goal": goal,
        "goal_category": goal_category,
        "budget": fields.get("Budget", "unknown"),
        "depth": fields.get("Depth", "unknown"),
        "signals": sorted(set(signal for signal in signals if signal and signal.lower() != "none")),
        "counts": {
            "key_files_found": key_files_found,
            "symbols_found": symbols_found,
            "deps_found": deps_found,
            "evidence_found": evidence_found,
            "key_files_omitted": key_files_omitted,
            "symbols_omitted": symbols_omitted,
            "deps_omitted": deps_omitted,
            "evidence_omitted": evidence_omitted,
        },
    }


def render_counter(counter: Counter, *, limit: int | None = None) -> list[str]:
    items = counter.most_common(limit)
    return [f"- {key}: {value}" for key, value in items] if items else ["- None"]


def recommended_backlog(signal_counts: Counter) -> list[str]:
    items: list[str] = []
    if signal_counts["no_match"]:
        items.append("- P0: improve no-match fallback, keyword expansion, and repository scope diagnostics.")
    if signal_counts["dependency_trace_empty"] or signal_counts["trace_goal_zero_dependencies"]:
        items.append("- P1: improve dependency/call tracing for trace-oriented goals.")
    if signal_counts["legacy_budget_exceeded"] or signal_counts["symbol_omission"] or signal_counts["legacy_symbol_saturation"]:
        items.append("- P1: tune symbol ranking, compact thresholds, and diversity caps.")
    if signal_counts["key_file_omission"] or signal_counts["legacy_key_file_saturation"]:
        items.append("- P1: tune file ranking and encourage narrower target paths for broad repositories.")
    if signal_counts["legacy_evidence_collected_when_not_requested"]:
        items.append("- P0: upgrade callers/reports to the budget-aware extractor so no-evidence runs avoid snippet collection.")
    if signal_counts["dependency_omission"]:
        items.append("- P2: expose dependency omission details or auto-escalate budget for dependency-heavy goals.")
    if signal_counts["stale_index"]:
        items.append("- P1: force refresh or improve stale-index recovery guidance.")
    if signal_counts["target_repo_no_tests"]:
        items.append("- Target-risk hygiene: keep no-test warnings separate from explorer effectiveness.")
    return items or ["- No recurring improvement backlog item detected yet."]


def render_summary(records: list[dict], reports_dir: Path) -> str:
    generated = datetime.now(timezone.utc).isoformat(timespec="seconds")
    status_counts = Counter(record["status"] for record in records)
    assessment_counts = Counter(record["assessment"] for record in records)
    validation_counts = Counter(record["validation"] for record in records)
    budget_counts = Counter(record["budget"] for record in records)
    depth_counts = Counter(record["depth"] for record in records)
    category_counts = Counter(record["goal_category"] for record in records)
    signal_counts = Counter(signal for record in records for signal in record["signals"])
    omitted_totals = Counter()
    for record in records:
        for key, value in record["counts"].items():
            if key.endswith("_omitted"):
                omitted_totals[key] += value

    recent = sorted(records, key=lambda item: item.get("generated", ""), reverse=True)[:12]

    lines: list[str] = [
        "# Repo Explorer Effectiveness Improvement Summary",
        "",
        f"- Generated: {generated}",
        f"- Reports directory: `{reports_dir}`",
        f"- Reports parsed: {len(records)}",
        "",
        "## Outcome Counts",
        "",
        "### Status",
        *render_counter(status_counts),
        "",
        "### Assessment",
        *render_counter(assessment_counts),
        "",
        "### Validation",
        *render_counter(validation_counts),
        "",
        "## Run Shape",
        "",
        "### Budget",
        *render_counter(budget_counts),
        "",
        "### Depth",
        *render_counter(depth_counts),
        "",
        "### Goal Category",
        *render_counter(category_counts),
        "",
        "## Improvement Signals",
        "",
        *render_counter(signal_counts, limit=20),
        "",
        "## Omitted Totals",
        "",
        *render_counter(omitted_totals),
        "",
        "## Recommended Backlog",
        "",
        *recommended_backlog(signal_counts),
        "",
        "## Recent Reports",
        "",
        "| Generated | Assessment | Budget | Goal category | Signals | File |",
        "|---|---|---|---|---|---|",
    ]

    for record in recent:
        signals = ", ".join(record["signals"][:5]) or "none"
        lines.append(
            f"| {record['generated'] or 'unknown'} | {record['assessment']} | {record['budget']} | "
            f"{record['goal_category']} | {signals} | `{record['file']}` |"
        )

    lines.extend([
        "",
        "## Notes",
        "",
        "- This summary is local-only and derived from Markdown effectiveness reports.",
        "- Legacy reports are inferred heuristically; v2 reports with explicit improvement signals are more reliable.",
    ])
    return "\n".join(lines) + "\n"


def main() -> int:
    default_reports_dir = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Summarize repo-explorer effectiveness reports")
    parser.add_argument("--reports-dir", default=str(default_reports_dir), help="Directory containing repo-explorer-effectiveness-*.md files")
    parser.add_argument("--output", help="Optional Markdown output path. Writes to stdout when omitted.")
    args = parser.parse_args()

    reports_dir = Path(args.reports_dir).resolve()
    report_paths = [path for path in sorted(reports_dir.glob(REPORT_GLOB)) if REPORT_NAME_RE.match(path.name)]
    records = [parse_report(path) for path in report_paths]
    summary = render_summary(records, reports_dir)

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(summary, encoding="utf-8")
        print(str(output_path))
    else:
        print(summary, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
