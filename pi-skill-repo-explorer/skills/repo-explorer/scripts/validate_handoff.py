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
    "schema_version", "explorer", "timestamp", "request", "index_info",
    "task_understanding", "key_files", "relevant_symbols",
    "dependency_map", "risks_and_unknowns",
    "next_actions_for_caller", "evidence", "errors",
]

REQUIRED_REQUEST = ["goal", "target_paths", "depth"]
REQUIRED_INDEX_INFO = ["index_path", "index_age_seconds", "files_indexed"]

VALID_DEPTHS = {"shallow", "standard", "deep"}
VALID_RELEVANCE = {"high", "medium"}
VALID_SYMBOL_KINDS = {"function", "class", "type", "constant", "module", "trait", "interface"}
VALID_DEPENDENCY_KINDS = {"import", "call", "config", "build"}
VALID_SEVERITIES = {"high", "medium", "low"}
VALID_PRIORITIES = {"high", "medium", "low"}
VALID_ERROR_CODES = {
    "insufficient_scope", "index_stale", "no_match", "redacted_secret", "budget_exceeded",
}

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
        if depth and depth not in VALID_DEPTHS:
            errors.append(f"Invalid depth value: {depth}")
        if "target_paths" in request and not isinstance(request["target_paths"], list):
            errors.append("request.target_paths must be a list")
    else:
        errors.append("'request' must be an object")

    index_info = data.get("index_info", {})
    if isinstance(index_info, dict):
        for field in REQUIRED_INDEX_INFO:
            if field not in index_info:
                errors.append(f"Missing required index_info field: {field}")
        for numeric in ("index_age_seconds", "files_indexed"):
            if numeric in index_info and not isinstance(index_info[numeric], (int, float)):
                errors.append(f"index_info.{numeric} must be numeric")
    elif "index_info" in data:
        errors.append("'index_info' must be an object")

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

    def require(item: dict, field: str, container: str, index: int):
        if field not in item:
            errors.append(f"{container}[{index}] missing '{field}'")
            return False
        return True

    list_fields = (
        "key_files", "relevant_symbols", "dependency_map", "risks_and_unknowns",
        "next_actions_for_caller", "evidence", "errors",
    )
    for field in list_fields:
        if field in data and not isinstance(data[field], list):
            errors.append(f"{field} must be a list")

    for i, item in enumerate(data.get("key_files", [])):
        if not isinstance(item, dict):
            errors.append("key_files items must be objects")
            continue
        for req in ("path", "role", "language", "lines", "relevance"):
            require(item, req, "key_files", i)
        if item.get("relevance") and item["relevance"] not in VALID_RELEVANCE:
            errors.append(f"key_files[{i}].relevance has invalid value: {item['relevance']}")
        if "lines" in item and not isinstance(item["lines"], int):
            errors.append(f"key_files[{i}].lines must be an integer")

    for i, item in enumerate(data.get("relevant_symbols", [])):
        if not isinstance(item, dict):
            errors.append("relevant_symbols items must be objects")
            continue
        for req in ("name", "kind", "file", "line_start", "line_end", "why"):
            require(item, req, "relevant_symbols", i)
        if item.get("kind") and item["kind"] not in VALID_SYMBOL_KINDS:
            errors.append(f"relevant_symbols[{i}].kind has invalid value: {item['kind']}")
        if isinstance(item.get("line_start"), int) and isinstance(item.get("line_end"), int):
            if item["line_end"] < item["line_start"]:
                errors.append(f"relevant_symbols[{i}] has line_end before line_start")

    for i, item in enumerate(data.get("dependency_map", [])):
        if not isinstance(item, dict):
            errors.append("dependency_map items must be objects")
            continue
        for req in ("source", "target", "kind"):
            require(item, req, "dependency_map", i)
        if item.get("kind") and item["kind"] not in VALID_DEPENDENCY_KINDS:
            errors.append(f"dependency_map[{i}].kind has invalid value: {item['kind']}")

    for i, item in enumerate(data.get("risks_and_unknowns", [])):
        if not isinstance(item, dict):
            errors.append("risks_and_unknowns items must be objects")
            continue
        for req in ("description", "severity", "affected_files"):
            require(item, req, "risks_and_unknowns", i)
        if item.get("severity") and item["severity"] not in VALID_SEVERITIES:
            errors.append(f"risks_and_unknowns[{i}].severity has invalid value: {item['severity']}")

    for i, item in enumerate(data.get("next_actions_for_caller", [])):
        if not isinstance(item, dict):
            errors.append("next_actions_for_caller items must be objects")
            continue
        for req in ("action", "target_agent", "priority"):
            require(item, req, "next_actions_for_caller", i)
        if item.get("priority") and item["priority"] not in VALID_PRIORITIES:
            errors.append(f"next_actions_for_caller[{i}].priority has invalid value: {item['priority']}")

    for i, item in enumerate(data.get("evidence", [])):
        if not isinstance(item, dict):
            errors.append("evidence items must be objects")
            continue
        for req in ("file", "line_start", "line_end", "snippet", "context"):
            require(item, req, "evidence", i)
        if isinstance(item.get("line_start"), int) and isinstance(item.get("line_end"), int):
            if item["line_end"] < item["line_start"]:
                errors.append(f"evidence[{i}] has line_end before line_start")

    for i, item in enumerate(data.get("errors", [])):
        if not isinstance(item, dict):
            errors.append("errors items must be objects")
            continue
        for req in ("code", "message"):
            require(item, req, "errors", i)
        if item.get("code") and item["code"] not in VALID_ERROR_CODES:
            errors.append(f"errors[{i}].code has invalid value: {item['code']}")

    return errors


def main():
    parser = argparse.ArgumentParser(description="Validate explorer handoff JSON")
    parser.add_argument("--input", required=True, help="Path to handoff JSON file")
    args = parser.parse_args()

    input_path = Path(args.input)
    try:
        if args.input == "-" or str(input_path) == "/dev/stdin":
            raw = sys.stdin.read()
        else:
            raw = input_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
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
    all_errors.extend(f"Unredacted secret pattern: {warning}" for warning in secret_warnings)

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
