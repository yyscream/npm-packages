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
from pathlib import Path, PurePosixPath

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
    "source": 1.5,
    "script": 1.2,
    "test": 1.0,
    "build_manifest": 0.9,
    "ci_cd": 0.8,
    "container": 0.8,
    "tooling_config": 0.6,
    "migration": 0.6,
    "documentation": 0.2,
    "vcs_config": 0.2,
    "environment": 0.0,
}

VALID_SYMBOL_KINDS = {"function", "class", "type", "constant", "module", "trait", "interface"}
VALID_CONFIDENCE = {"high", "medium", "low"}

KIND_NORMALIZATION = {
    "class_or_function": "function",
    "public_symbol": "module",
    "symbol": "module",
    "export": "module",
}

KEYWORD_SYNONYMS = {
    "auth": {"authenticate", "authentication", "authorization", "login", "session", "user"},
    "authentication": {"auth", "authenticate", "login", "session", "user"},
    "authenticate": {"auth", "authentication", "login", "session", "user"},
    "login": {"auth", "authenticate", "authentication", "session", "user"},
    "token": {"budget", "compact", "output", "efficiency"},
    "efficiency": {"budget", "compact", "output", "token"},
    "test": {"tests", "testing", "pytest", "unittest"},
    "tests": {"test", "testing", "pytest", "unittest"},
}


def redact_secrets(text: str) -> tuple[str, bool]:
    redacted = False
    for pattern in SECRET_PATTERNS:
        if pattern.search(text):
            text = pattern.sub("[REDACTED]", text)
            redacted = True
    return text, redacted


def tokenize_text(text: str) -> list[str]:
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", text)
    return re.findall(r"[a-zA-Z_][a-zA-Z0-9_]*", text.lower())


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
    words = tokenize_text(goal)
    return [w for w in words if w not in stop_words and len(w) > 2]


def expand_keywords(keywords: list[str]) -> set[str]:
    expanded = set(keywords)
    for kw in keywords:
        expanded.update(KEYWORD_SYNONYMS.get(kw, set()))
    return expanded


def normalize_symbol_kind(kind: str) -> str:
    normalized = KIND_NORMALIZATION.get(kind, kind)
    return normalized if normalized in VALID_SYMBOL_KINDS else "module"


def confidence_label(score: float, *, high: float, medium: float) -> str:
    if score >= high:
        return "high"
    if score >= medium:
        return "medium"
    return "low"


def confidence_reason(confidence: str, score: float, has_goal_keywords: bool) -> str:
    if not has_goal_keywords:
        return f"{confidence} confidence from repository role/context because no specific goal keywords were extracted."
    if confidence == "high":
        return "High confidence: direct path, symbol, or content match to the exploration goal."
    if confidence == "medium":
        return "Medium confidence: lexical or contextual match to the exploration goal."
    return "Low confidence: weak match included to preserve nearby repository context."


def content_keyword_score(file_entry: dict, keywords: set[str]) -> float:
    if not keywords or file_entry.get("content_sensitive"):
        return 0.0
    try:
        path = Path(file_entry["path"])
        if not path.exists() or path.stat().st_size > 300_000:
            return 0.0
        text = path.read_text(encoding="utf-8", errors="replace")[:300_000]
    except (OSError, PermissionError):
        return 0.0

    tokens = tokenize_text(text)
    if not tokens:
        return 0.0
    token_set = set(tokens)
    hits = sum(1 for kw in keywords if kw in token_set)
    return min(4.0, hits * 0.8)


def normalize_rel_path(path: str) -> str:
    return path.replace("\\", "/")


def resolve_internal_import(source_rel: str, target: str, lang: str, rel_paths: set[str]) -> str | None:
    source = PurePosixPath(normalize_rel_path(source_rel))
    source_dir = source.parent
    candidates = []

    def add_candidates(base: PurePosixPath):
        candidates.append(base.as_posix())
        for suffix in (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rs", ".go"):
            candidates.append(base.with_suffix(suffix).as_posix() if base.suffix else f"{base.as_posix()}{suffix}")
        for index_name in ("index.ts", "index.tsx", "index.js", "__init__.py", "mod.rs"):
            candidates.append((base / index_name).as_posix())

    if target.startswith("."):
        add_candidates(source_dir / target)
    elif lang == "python":
        module_path = PurePosixPath(*target.split("."))
        add_candidates(source_dir / module_path)
        add_candidates(module_path)
    elif lang == "rust":
        module_path = PurePosixPath(*target.split("::"))
        add_candidates(source_dir / module_path)
    elif lang == "go" and "/" in target:
        add_candidates(PurePosixPath(target))

    for candidate in candidates:
        normalized = normalize_rel_path(candidate)
        if normalized in rel_paths:
            return normalized
    return None


def score_file(file_entry: dict, keywords: list[str]) -> float:
    expanded = expand_keywords(keywords)
    score = PRIORITY_ROLES.get(file_entry.get("role", "source"), 0.5)
    matched_goal = False

    rel_path = file_entry.get("relative_path", "")
    path_tokens = set(tokenize_text(rel_path))
    basename_tokens = set(tokenize_text(Path(rel_path).stem))

    for kw in expanded:
        if kw in basename_tokens:
            score += 6.0
            matched_goal = True
        elif kw in path_tokens:
            score += 4.0
            matched_goal = True

    for sym in file_entry.get("symbols", []):
        sym_tokens = set(tokenize_text(sym.get("name", "")))
        hits = sym_tokens & expanded
        if hits:
            score += 3.0 * len(hits)
            matched_goal = True

    content_score = content_keyword_score(file_entry, expanded)
    if content_score:
        score += content_score
        matched_goal = True

    lines = file_entry.get("lines", 0)
    if matched_goal and 5 < lines < 800:
        score += 0.5

    if keywords and not matched_goal and file_entry.get("role") in {"documentation", "vcs_config"}:
        score -= 0.5

    return max(0.0, score)


def score_symbol(sym: dict, file_entry: dict, keywords: list[str]) -> float:
    expanded = expand_keywords(keywords)
    name_tokens = set(tokenize_text(sym.get("name", "")))
    score = 0.0

    for kw in expanded:
        if kw in name_tokens:
            score += 5.0
        elif kw in sym.get("name", "").lower():
            score += 1.5

    if score > 0 and normalize_symbol_kind(sym.get("kind", "")) in {"function", "class", "interface", "type"}:
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
    min_file_score = 0.1 if not keywords else {"shallow": 2.0, "standard": 2.0, "deep": 1.0}.get(depth, 2.0)

    key_files = []
    for f, score in top_files:
        if score < min_file_score:
            continue
        relevance = "high" if score >= 5.0 else "medium"
        confidence = confidence_label(score, high=7.0, medium=3.0)
        key_files.append({
            "path": f["path"],
            "role": f.get("role", "source"),
            "language": f.get("language", "unknown"),
            "lines": f.get("lines", 0),
            "relevance": relevance,
            "confidence": confidence,
            "confidence_reason": confidence_reason(confidence, score, bool(keywords)),
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
    min_symbol_score = 0.1 if not keywords else {"shallow": 3.0, "standard": 3.0, "deep": 1.0}.get(depth, 3.0)
    for sym, f, score in all_symbols:
        if score < min_symbol_score:
            continue
        kind = normalize_symbol_kind(sym.get("kind", ""))
        line_start = sym.get("line_start", sym.get("line", 0))
        line_end = sym.get("line_end", line_start)
        confidence = confidence_label(score, high=6.0, medium=3.0)
        relevant_symbols.append({
            "name": sym["name"],
            "kind": kind,
            "file": f["path"],
            "line_start": line_start,
            "line_end": line_end,
            "why": f"Matches goal keywords; {kind} in {f.get('relative_path', '')}",
            "confidence": confidence,
            "confidence_reason": confidence_reason(confidence, score, bool(keywords)),
        })
        if len(relevant_symbols) >= HARD_LIMITS["relevant_symbols"]:
            errors.append({
                "code": "budget_exceeded",
                "message": f"relevant_symbols trimmed to {HARD_LIMITS['relevant_symbols']}",
            })
            break

    evidence = []
    evidence_count = 0
    evidence_limit = {"shallow": 0, "standard": 5, "deep": 10}.get(depth, 5)
    for sym, f, score in all_symbols[:HARD_LIMITS["evidence"]]:
        if evidence_count >= evidence_limit:
            break
        if score < 3.0:
            continue
        line_start = sym.get("line_start", sym.get("line", 1))
        snippet = extract_evidence_snippet(f["path"], line_start)
        if snippet:
            snippet, was_redacted = redact_secrets(snippet)
            if was_redacted:
                had_redaction = True
            confidence = confidence_label(score, high=6.0, medium=3.0)
            snippet_line_end = min(line_start + snippet.count("\n"), f.get("lines", line_start))
            evidence.append({
                "file": f["path"],
                "line_start": line_start,
                "line_end": snippet_line_end,
                "snippet": snippet,
                "context": f"Definition of {sym['name']} — relevant to: {goal}",
                "confidence": confidence,
                "confidence_reason": confidence_reason(confidence, score, bool(keywords)),
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
    key_file_paths = {f["path"] for f in key_files}
    rel_paths = {normalize_rel_path(f.get("relative_path", "")) for f in files}
    if depth == "shallow":
        top_files_for_dependencies = []
    else:
        top_files_for_dependencies = top_files[:HARD_LIMITS["dependency_map"]]
    for f, _ in top_files_for_dependencies:
        if key_file_paths and f["path"] not in key_file_paths:
            continue
        if f.get("content_sensitive"):
            continue
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
                    source_rel = normalize_rel_path(f.get("relative_path", f["path"]))
                    internal_target = resolve_internal_import(source_rel, target, lang, rel_paths)
                    if depth != "deep" and internal_target is None:
                        continue
                    display_target = internal_target or target
                    key = (source_rel, display_target)
                    if key not in seen_deps:
                        seen_deps.add(key)
                        dep_map.append({
                            "source": source_rel,
                            "target": display_target,
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
            "index_info": {"index_path": str(index_path), "index_age_seconds": 0, "files_indexed": 0},
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
