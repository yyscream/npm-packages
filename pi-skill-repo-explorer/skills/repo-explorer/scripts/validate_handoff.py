#!/usr/bin/env python3
"""Validate an explorer handoff JSON against the contract schema.

Checks structure, required fields, hard limits, and redaction rules.

Usage:
    echo '{"schema_version":"1.0",...}' | python3 validate_handoff.py --input /dev/stdin
    python3 validate_handoff.py --input handoff.json

Exit codes:
    0 — valid
    1 — validation errors found
"""

import argparse
import json
import re
import sys
from pathlib import Path

HARD_LIMITS = {
    "key_files": 25,
    "relevant_symbols": 30,
    "dependency_map": 20,
    "evidence": 15,
    "risks_and_unknowns": 10,
    "next_actions_for_caller": 8,
}

MAX_EVIDENCE_SNIPPET_LINES = 20

REQUIRED_TOP_LEVEL = [
    "schema_version", "explorer", "timestamp", "request",
    "task_understanding", "key_files", "relevant_symbols",
    "dependency_map", "risks_and_unknowns",
    "next_actions_for_caller", "evidence",
]

REQUIRED_REQUEST = ["goal", "target_paths", "depth"]

SECRET_PATTERNS = [
    re.compile(r"sk-[a-zA-Z0-9]{20,}"),
    re.compile(r"ghp_[a-zA-Z0-9]{36,}"),
    re.compile(r"gho_[a-zA-Z0-9]{36,}"),
    re.compile(r"AKIA[A-Z0-9]{16}"),
    re.compile(r"Bearer\s+[a-zA-Z0-9\-._~+/]+=*", re.IGNORECASE),
    re.compile(r"token\s*[=:]\s*['\"]?[a-zA-Z0-9\-._~+/]{20,}['\"]?", re.IGNORECASE),
    re.compile(r"password\s*[=:]\s*['\"]?[^\s'\"]{8,}['\"]?", re.IGNORECASE),
    re.compile(r"-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----"),
]


def validate_structure(data: dict) -> list[str]:
    errors = []

    for field in REQUIRED_TOP_LEVEL:
        if field not in data:
            errors.append(f"Missing required top-level field: {field}")

    if data.get("schema_version") != "1.0":
        errors.append(f"Unsupported schema_version: {data.get('schema_version')}")

    request = data.get("request", {})
    if isinstance(request, dict):
        for field in REQUIRED_REQUEST:
            if field not in request:
                errors.append(f"Missing required request field: {field}")
        depth = request.get("depth")
        if depth and depth not in ("shallow", "standard", "deep"):
            errors.append(f"Invalid depth value: {depth}")
    else:
        errors.append("'request' must be an object")

    return errors


def validate_limits(data: dict) -> list[str]:
    errors = []
    for field, limit in HARD_LIMITS.items():
        items = data.get(field, [])
        if isinstance(items, list) and len(items) > limit:
            errors.append(
                f"'{field}' exceeds hard limit: {len(items)} items (max {limit})"
            )
    return errors


def validate_evidence_snippets(data: dict) -> list[str]:
    errors = []
    for i, item in enumerate(data.get("evidence", [])):
        snippet = item.get("snippet", "")
        lines = snippet.count("\n") + 1
        if lines > MAX_EVIDENCE_SNIPPET_LINES:
            errors.append(
                f"evidence[{i}] snippet has {lines} lines (max {MAX_EVIDENCE_SNIPPET_LINES})"
            )
    return errors


def scan_secrets(data: dict) -> list[str]:
    warnings = []

    def scan_value(val, path=""):
        if isinstance(val, str):
            for pattern in SECRET_PATTERNS:
                if pattern.search(val):
                    warnings.append(
                        f"Potential secret found at {path}: matches pattern {pattern.pattern[:40]}..."
                    )
                    break
        elif isinstance(val, dict):
            for k, v in val.items():
                scan_value(v, f"{path}.{k}")
        elif isinstance(val, list):
            for i, v in enumerate(val):
                scan_value(v, f"{path}[{i}]")

    scan_value(data)
    return warnings


def validate_field_types(data: dict) -> list[str]:
    errors = []

    for item in data.get("key_files", []):
        if not isinstance(item, dict):
            errors.append("key_files items must be objects")
            break
        for req in ("path", "role", "language"):
            if req not in item:
                errors.append(f"key_files item missing '{req}'")
                break

    for item in data.get("relevant_symbols", []):
        if not isinstance(item, dict):
            errors.append("relevant_symbols items must be objects")
            break
        for req in ("name", "kind", "file"):
            if req not in item:
                errors.append(f"relevant_symbols item missing '{req}'")
                break

    for item in data.get("evidence", []):
        if not isinstance(item, dict):
            errors.append("evidence items must be objects")
            break
        for req in ("file", "snippet", "context"):
            if req not in item:
                errors.append(f"evidence item missing '{req}'")
                break

    return errors


def main():
    parser = argparse.ArgumentParser(description="Validate explorer handoff JSON")
    parser.add_argument("--input", required=True, help="Path to handoff JSON file")
    args = parser.parse_args()

    input_path = Path(args.input)
    try:
        if str(input_path) == "/dev/stdin":
            raw = sys.stdin.read()
        else:
            raw = input_path.read_text(encoding="utf-8")
    except OSError as e:
        print(json.dumps({"valid": False, "errors": [f"Cannot read input: {e}"]}))
        sys.exit(1)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({"valid": False, "errors": [f"Invalid JSON: {e}"]}))
        sys.exit(1)

    if not isinstance(data, dict):
        print(json.dumps({"valid": False, "errors": ["Top-level must be a JSON object"]}))
        sys.exit(1)

    all_errors = []
    all_errors.extend(validate_structure(data))
    all_errors.extend(validate_limits(data))
    all_errors.extend(validate_evidence_snippets(data))
    all_errors.extend(validate_field_types(data))

    secret_warnings = scan_secrets(data)

    result = {
        "valid": len(all_errors) == 0,
        "errors": all_errors,
        "warnings": secret_warnings,
        "stats": {
            "key_files": len(data.get("key_files", [])),
            "relevant_symbols": len(data.get("relevant_symbols", [])),
            "dependency_map": len(data.get("dependency_map", [])),
            "evidence": len(data.get("evidence", [])),
            "risks_and_unknowns": len(data.get("risks_and_unknowns", [])),
            "next_actions_for_caller": len(data.get("next_actions_for_caller", [])),
        },
    }

    print(json.dumps(result, indent=2))
    sys.exit(0 if result["valid"] else 1)


if __name__ == "__main__":
    main()
