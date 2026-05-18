#!/usr/bin/env python3
"""Generate a strict JSON handoff from a repo index + exploration goal.

Reads the persistent index, filters and ranks files/symbols by relevance
to the stated goal, and emits a contract-compliant JSON handoff.

Usage:
    python3 extract_explorer_handoff.py \
        --index data/repo-index.json \
        --goal "find the authentication flow" \
        --depth standard

Output: JSON handoff to stdout (pipe to validate_handoff.py to verify).
"""

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

HARD_LIMITS = {
    "key_files": 25,
    "relevant_symbols": 30,
    "dependency_map": 20,
    "evidence": 15,
    "risks_and_unknowns": 10,
    "next_actions_for_caller": 8,
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

PRIORITY_ROLES = {
    "build_manifest": 10,
    "environment": 9,
    "container": 8,
    "ci_cd": 7,
    "source": 5,
    "test": 4,
    "script": 4,
    "tooling_config": 3,
    "documentation": 3,
    "migration": 3,
    "vcs_config": 1,
}


def redact_secrets(text: str) -> tuple[str, bool]:
    redacted = False
    for pattern in SECRET_PATTERNS:
        if pattern.search(text):
            text = pattern.sub("[REDACTED]", text)
            redacted = True
    return text, redacted


def goal_keywords(goal: str) -> list[str]:
    stop_words = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "shall",
        "should", "may", "might", "must", "can", "could",
        "i", "you", "he", "she", "it", "we", "they",
        "this", "that", "these", "those", "my", "your", "our", "their",
        "and", "or", "but", "not", "no", "if", "then", "else",
        "in", "on", "at", "to", "for", "of", "with", "from", "by",
        "find", "locate", "where", "how", "what", "show", "get",
        "understand", "explore", "map", "trace", "identify",
    }
    words = re.findall(r"[a-zA-Z_][a-zA-Z0-9_]*", goal.lower())
    return [w for w in words if w not in stop_words and len(w) > 2]


def score_file(file_entry: dict, keywords: list[str]) -> float:
    score = 0.0

    role = file_entry.get("role", "source")
    score += PRIORITY_ROLES.get(role, 2)

    rel_path = file_entry.get("relative_path", "").lower()
    for kw in keywords:
        if kw in rel_path:
            score += 5.0

    for sym in file_entry.get("symbols", []):
        sym_name = sym.get("name", "").lower()
        for kw in keywords:
            if kw in sym_name:
                score += 3.0

    lines = file_entry.get("lines", 0)
    if 10 < lines < 500:
        score += 1.0

    return score


def score_symbol(sym: dict, file_entry: dict, keywords: list[str]) -> float:
    score = 0.0
    name = sym.get("name", "").lower()

    for kw in keywords:
        if kw in name:
            score += 5.0
        if kw == name:
            score += 3.0

    kind = sym.get("kind", "")
    if "public" in kind or "export" in kind:
        score += 2.0
    if kind in ("class_or_function", "function", "type"):
        score += 1.0

    return score


def extract_evidence_snippet(file_path: str, line_start: int, max_lines: int = 20) -> str | None:
    try:
        p = Path(file_path)
        if not p.exists() or p.stat().st_size > 1_000_000:
            return None
        lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
        start = max(0, line_start - 1)
        end = min(len(lines), start + max_lines)
        return "\n".join(lines[start:end])
    except (OSError, PermissionError):
        return None


def build_handoff(index: dict, goal: str, depth: str, target_paths: list[str]) -> dict:
    keywords = goal_keywords(goal)
    files = index.get("files", [])
    errors = []
    had_redaction = False

    index_age = 0
    built_at = index.get("built_at", "")
    if built_at:
        try:
            built_dt = datetime.fromisoformat(built_at)
            index_age = int((datetime.now(timezone.utc) - built_dt).total_seconds())
        except ValueError:
            pass

    if index_age > 86400:
        errors.append({
            "code": "index_stale",
            "message": f"Index is {index_age // 3600}h old. Results may be outdated.",
        })

    scored_files = [(f, score_file(f, keywords)) for f in files]
    scored_files.sort(key=lambda x: -x[1])

    depth_file_limit = {"shallow": 10, "standard": 25, "deep": 25}.get(depth, 25)
    top_files = scored_files[:depth_file_limit]

    key_files = []
    for f, score in top_files:
        if score < 1.0 and depth != "deep":
            continue
        relevance = "high" if score >= 5.0 else "medium"
        key_files.append({
            "path": f["path"],
            "role": f.get("role", "source"),
            "language": f.get("language", "unknown"),
            "lines": f.get("lines", 0),
            "relevance": relevance,
        })

    if len(key_files) > HARD_LIMITS["key_files"]:
        key_files = key_files[:HARD_LIMITS["key_files"]]
        errors.append({
            "code": "budget_exceeded",
            "message": f"key_files trimmed to {HARD_LIMITS['key_files']}",
        })

    all_symbols = []
    for f, _ in top_files:
        for sym in f.get("symbols", []):
            sym_score = score_symbol(sym, f, keywords)
            all_symbols.append((sym, f, sym_score))

    all_symbols.sort(key=lambda x: -x[2])

    relevant_symbols = []
    for sym, f, score in all_symbols:
        if score < 1.0 and depth != "deep":
            continue
        relevant_symbols.append({
            "name": sym["name"],
            "kind": sym.get("kind", "symbol"),
            "file": f["path"],
            "line_start": sym.get("line", 0),
            "line_end": sym.get("line", 0),
            "why": f"Matches goal keywords; {sym.get('kind', 'symbol')} in {f.get('relative_path', '')}",
        })
        if len(relevant_symbols) >= HARD_LIMITS["relevant_symbols"]:
            errors.append({
                "code": "budget_exceeded",
                "message": f"relevant_symbols trimmed to {HARD_LIMITS['relevant_symbols']}",
            })
            break

    evidence = []
    evidence_count = 0
    for sym, f, score in all_symbols[:HARD_LIMITS["evidence"]]:
        if score < 3.0:
            continue
        snippet = extract_evidence_snippet(f["path"], sym.get("line", 1))
        if snippet:
            snippet, was_redacted = redact_secrets(snippet)
            if was_redacted:
                had_redaction = True
            evidence.append({
                "file": f["path"],
                "line_start": sym.get("line", 1),
                "line_end": min(sym.get("line", 1) + 19, f.get("lines", sym.get("line", 1) + 19)),
                "snippet": snippet,
                "context": f"Definition of {sym['name']} — relevant to: {goal}",
            })
            evidence_count += 1
            if evidence_count >= HARD_LIMITS["evidence"]:
                break

    if had_redaction:
        errors.append({
            "code": "redacted_secret",
            "message": "Sensitive values were found and redacted in evidence snippets.",
        })

    dep_map = []
    seen_deps = set()
    for f, _ in top_files[:HARD_LIMITS["dependency_map"]]:
        fpath = Path(f["path"])
        if not fpath.exists() or fpath.stat().st_size > 500_000:
            continue
        try:
            content = fpath.read_text(encoding="utf-8", errors="replace")
        except (OSError, PermissionError):
            continue

        lang = f.get("language", "")
        import_patterns = []
        if lang == "python":
            import_patterns = [
                re.compile(r"^\s*(?:from|import)\s+([\w.]+)"),
            ]
        elif lang in ("typescript", "javascript"):
            import_patterns = [
                re.compile(r"""^\s*import\s+.*?from\s+['"]([^'"]+)['"]"""),
                re.compile(r"""^\s*(?:const|let|var)\s+.*?=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)"""),
            ]
        elif lang == "rust":
            import_patterns = [
                re.compile(r"^\s*use\s+([\w:]+)"),
                re.compile(r"^\s*mod\s+(\w+)"),
            ]
        elif lang == "go":
            import_patterns = [
                re.compile(r"""^\s*"([^"]+)"\s*$"""),
            ]

        for line in content.splitlines()[:200]:
            for pat in import_patterns:
                m = pat.match(line)
                if m:
                    target = m.group(1)
                    key = (f.get("relative_path", ""), target)
                    if key not in seen_deps:
                        seen_deps.add(key)
                        dep_map.append({
                            "source": f.get("relative_path", f["path"]),
                            "target": target,
                            "kind": "import",
                        })

    if len(dep_map) > HARD_LIMITS["dependency_map"]:
        dep_map = dep_map[:HARD_LIMITS["dependency_map"]]

    risks = []
    role_breakdown = index.get("role_breakdown", {})
    test_count = role_breakdown.get("test", 0)
    source_count = role_breakdown.get("source", 0)
    if source_count > 0 and test_count == 0:
        risks.append({
            "description": "No test files found in repository",
            "severity": "high",
            "affected_files": [],
        })
    elif source_count > 0 and test_count / source_count < 0.1:
        risks.append({
            "description": f"Low test coverage: {test_count} test files for {source_count} source files",
            "severity": "medium",
            "affected_files": [],
        })

    if not key_files:
        errors.append({
            "code": "no_match",
            "message": "No files matched the exploration goal.",
        })

    next_actions = []
    if key_files:
        next_actions.append({
            "action": f"Review the top {min(5, len(key_files))} key files identified for the goal",
            "target_agent": None,
            "priority": "high",
        })
    if risks:
        next_actions.append({
            "action": "Address identified risks before proceeding with implementation",
            "target_agent": None,
            "priority": "medium",
        })

    handoff = {
        "schema_version": "1.0",
        "explorer": "pathfinder",
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "request": {
            "goal": goal,
            "target_paths": target_paths,
            "depth": depth,
        },
        "index_info": {
            "index_path": "",
            "index_age_seconds": index_age,
            "files_indexed": index.get("total_files", 0),
        },
        "task_understanding": f"The caller needs to understand: {goal}. "
            f"Exploring {index.get('total_files', 0)} files across "
            f"{len(index.get('language_breakdown', {}))} languages in {index.get('repo_name', 'unknown')}.",
        "key_files": key_files,
        "relevant_symbols": relevant_symbols,
        "dependency_map": dep_map,
        "risks_and_unknowns": risks,
        "next_actions_for_caller": next_actions,
        "evidence": evidence,
        "errors": errors,
    }

    return handoff


def main():
    parser = argparse.ArgumentParser(description="Extract explorer handoff from index")
    parser.add_argument("--index", required=True, help="Path to repo index JSON")
    parser.add_argument("--goal", required=True, help="Exploration goal")
    parser.add_argument("--depth", default="standard", choices=["shallow", "standard", "deep"])
    parser.add_argument("--target-paths", nargs="*", default=[], help="Target paths explored")
    args = parser.parse_args()

    index_path = Path(args.index)
    if not index_path.exists():
        print(json.dumps({
            "schema_version": "1.0",
            "explorer": "pathfinder",
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "request": {"goal": args.goal, "target_paths": args.target_paths, "depth": args.depth},
            "task_understanding": "Cannot explore: index not found.",
            "key_files": [], "relevant_symbols": [], "dependency_map": [],
            "risks_and_unknowns": [], "next_actions_for_caller": [],
            "evidence": [],
            "errors": [{"code": "insufficient_scope", "message": f"Index not found: {index_path}"}],
        }, indent=2))
        sys.exit(1)

    index = json.loads(index_path.read_text(encoding="utf-8"))
    target_paths = args.target_paths or [index.get("repo_path", "")]

    handoff = build_handoff(index, args.goal, args.depth, target_paths)
    handoff["index_info"]["index_path"] = str(index_path)

    print(json.dumps(handoff, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
