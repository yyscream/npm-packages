#!/usr/bin/env python3
"""Build a persistent repo index for the Pathfinder explorer agent.

Scans a repository directory tree and records file metadata, language hints,
and lightweight symbol extraction into a JSON index file for fast subsequent
exploration.

Usage:
    python3 build_repo_index.py --repo /path/to/repo --output data/repo-index.json
"""

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

IGNORE_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env",
    ".tox", ".mypy_cache", ".pytest_cache", ".ruff_cache",
    "target", "dist", "build", ".next", ".nuxt", ".output",
    "vendor", ".cargo", ".gradle", ".idea", ".vscode",
    "coverage", ".nyc_output", "egg-info",
}

IGNORE_EXTENSIONS = {
    ".pyc", ".pyo", ".o", ".so", ".dylib", ".dll", ".exe",
    ".wasm", ".min.js", ".min.css", ".map",
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
    ".mp3", ".mp4", ".wav", ".avi", ".mov",
    ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".sqlite", ".db", ".sqlite3",
    ".lock",
}

LANGUAGE_MAP = {
    ".py": "python", ".pyi": "python",
    ".rs": "rust",
    ".ts": "typescript", ".tsx": "typescript",
    ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".json": "json", ".jsonc": "json",
    ".toml": "toml",
    ".yaml": "yaml", ".yml": "yaml",
    ".md": "markdown",
    ".html": "html", ".htm": "html",
    ".css": "css", ".scss": "scss", ".less": "less",
    ".sh": "shell", ".bash": "shell", ".zsh": "shell",
    ".sql": "sql",
    ".go": "go",
    ".java": "java",
    ".kt": "kotlin",
    ".swift": "swift",
    ".c": "c", ".h": "c",
    ".cpp": "cpp", ".hpp": "cpp", ".cc": "cpp",
    ".rb": "ruby",
    ".php": "php",
    ".lua": "lua",
    ".zig": "zig",
    ".nix": "nix",
    ".tf": "terraform",
    ".dockerfile": "docker",
    ".proto": "protobuf",
    ".graphql": "graphql", ".gql": "graphql",
}

SYMBOL_PATTERNS = {
    "python": [
        (r"^(?:class|def)\s+(\w+)", "class_or_function"),
        (r"^(\w+)\s*=\s*", "constant"),
    ],
    "rust": [
        (r"^pub\s+(?:fn|struct|enum|trait|type|const|mod)\s+(\w+)", "public_symbol"),
        (r"^(?:fn|struct|enum|trait|type|const|mod)\s+(\w+)", "symbol"),
    ],
    "typescript": [
        (r"^export\s+(?:function|class|interface|type|const|enum|let|var)\s+(\w+)", "export"),
        (r"^(?:function|class|interface|type)\s+(\w+)", "symbol"),
    ],
    "javascript": [
        (r"^export\s+(?:function|class|const|let|var|default)\s+(\w+)", "export"),
        (r"^(?:function|class)\s+(\w+)", "symbol"),
    ],
    "go": [
        (r"^func\s+(?:\([^)]+\)\s+)?(\w+)", "function"),
        (r"^type\s+(\w+)\s+(?:struct|interface)", "type"),
    ],
}

MAX_FILE_SIZE_BYTES = 1_000_000  # skip files over 1MB for symbol extraction


def file_hash(path: Path) -> str:
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
    except (OSError, PermissionError):
        return ""
    return h.hexdigest()[:16]


def detect_language(path: Path) -> str:
    name_lower = path.name.lower()
    if name_lower == "dockerfile" or name_lower.startswith("dockerfile."):
        return "docker"
    if name_lower in ("makefile", "gnumakefile"):
        return "makefile"
    if name_lower in ("cargo.toml", "pyproject.toml", "package.json", "go.mod"):
        return LANGUAGE_MAP.get(path.suffix.lower(), "config")
    return LANGUAGE_MAP.get(path.suffix.lower(), "unknown")


def count_lines(path: Path) -> int:
    try:
        with open(path, "rb") as f:
            return sum(1 for _ in f)
    except (OSError, PermissionError):
        return 0


def extract_symbols(path: Path, language: str) -> list:
    patterns = SYMBOL_PATTERNS.get(language, [])
    if not patterns:
        return []

    try:
        size = path.stat().st_size
        if size > MAX_FILE_SIZE_BYTES:
            return []
        content = path.read_text(encoding="utf-8", errors="replace")
    except (OSError, PermissionError):
        return []

    symbols = []
    compiled = [(re.compile(p), kind) for p, kind in patterns]
    for line_num, line in enumerate(content.splitlines(), 1):
        stripped = line.strip()
        for regex, kind in compiled:
            m = regex.match(stripped)
            if m:
                symbols.append({
                    "name": m.group(1),
                    "kind": kind,
                    "line": line_num,
                })
                break
    return symbols


def classify_role(path: Path, rel_path: str) -> str:
    name_lower = path.name.lower()
    if name_lower in (
        "readme.md", "readme.txt", "readme.rst", "readme",
        "license", "license.md", "license.txt",
        "changelog.md", "changelog.txt", "changes.md",
    ):
        return "documentation"
    if name_lower in (
        "package.json", "cargo.toml", "pyproject.toml", "go.mod",
        "gemfile", "build.gradle", "pom.xml", "mix.exs",
        "setup.py", "setup.cfg",
    ):
        return "build_manifest"
    if name_lower in (
        "dockerfile", "docker-compose.yml", "docker-compose.yaml",
        ".dockerignore",
    ) or name_lower.startswith("dockerfile."):
        return "container"
    if name_lower in (".env", ".env.example", ".env.local"):
        return "environment"
    if name_lower in (
        "tsconfig.json", ".eslintrc.json", ".prettierrc",
        "jest.config.js", "jest.config.ts", "vitest.config.ts",
        ".babelrc", "webpack.config.js", "vite.config.ts",
        "tailwind.config.js", "tailwind.config.ts",
        "rustfmt.toml", "clippy.toml", ".flake8", "ruff.toml",
    ):
        return "tooling_config"
    if name_lower in (".gitignore", ".gitattributes", ".editorconfig"):
        return "vcs_config"

    parts = set(Path(rel_path).parts)
    if parts & {"test", "tests", "__tests__", "spec", "specs", "testing"}:
        return "test"
    if parts & {".github", ".gitlab", ".circleci"}:
        return "ci_cd"
    if parts & {"docs", "doc", "documentation"}:
        return "documentation"
    if parts & {"scripts", "bin", "tools"}:
        return "script"
    if parts & {"migrations", "migrate"}:
        return "migration"

    if name_lower.startswith("test_") or name_lower.endswith("_test.py"):
        return "test"
    if name_lower.endswith((".test.ts", ".test.js", ".test.tsx", ".spec.ts", ".spec.js")):
        return "test"

    return "source"


def should_skip_dir(dir_name: str) -> bool:
    return dir_name in IGNORE_DIRS or dir_name.startswith(".")


def should_skip_file(path: Path) -> bool:
    if path.suffix.lower() in IGNORE_EXTENSIONS:
        return True
    if path.name.startswith(".") and path.suffix == "":
        return True
    return False


def scan_repo(repo_path: Path) -> dict:
    files = []
    language_stats = {}
    role_stats = {}

    for root, dirs, filenames in os.walk(repo_path, topdown=True):
        dirs[:] = [d for d in dirs if not should_skip_dir(d)]
        dirs.sort()

        for fname in sorted(filenames):
            fpath = Path(root) / fname
            if should_skip_file(fpath):
                continue

            try:
                stat = fpath.stat()
            except (OSError, PermissionError):
                continue

            rel_path = str(fpath.relative_to(repo_path))
            language = detect_language(fpath)
            lines = count_lines(fpath)
            role = classify_role(fpath, rel_path)
            symbols = extract_symbols(fpath, language)

            language_stats[language] = language_stats.get(language, 0) + 1
            role_stats[role] = role_stats.get(role, 0) + 1

            entry = {
                "path": str(fpath),
                "relative_path": rel_path,
                "language": language,
                "lines": lines,
                "size_bytes": stat.st_size,
                "mtime": stat.st_mtime,
                "hash": file_hash(fpath),
                "role": role,
            }
            if symbols:
                entry["symbols"] = symbols

            files.append(entry)

    return {
        "schema_version": "1.0",
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "repo_path": str(repo_path),
        "repo_name": repo_path.name,
        "total_files": len(files),
        "language_breakdown": dict(sorted(language_stats.items(), key=lambda x: -x[1])),
        "role_breakdown": dict(sorted(role_stats.items(), key=lambda x: -x[1])),
        "files": files,
    }


def main():
    parser = argparse.ArgumentParser(description="Build persistent repo index")
    parser.add_argument("--repo", required=True, help="Absolute path to repository root")
    parser.add_argument("--output", required=True, help="Output path for index JSON")
    args = parser.parse_args()

    repo_path = Path(args.repo).resolve()
    if not repo_path.is_dir():
        print(json.dumps({"error": f"Repository not found: {repo_path}"}), file=sys.stderr)
        sys.exit(1)

    index = scan_repo(repo_path)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(index, indent=2, ensure_ascii=False), encoding="utf-8")

    print(json.dumps({
        "status": "ok",
        "repo": str(repo_path),
        "files_indexed": index["total_files"],
        "output": str(output_path),
        "languages": index["language_breakdown"],
    }, indent=2))


if __name__ == "__main__":
    main()
