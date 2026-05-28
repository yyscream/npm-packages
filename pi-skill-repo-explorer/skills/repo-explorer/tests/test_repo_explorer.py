import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = SKILL_DIR / "scripts"
BUILD_INDEX = SCRIPTS_DIR / "build_repo_index.py"
EXTRACT_HANDOFF = SCRIPTS_DIR / "extract_explorer_handoff.py"
VALIDATE_HANDOFF = SCRIPTS_DIR / "validate_handoff.py"


def _env():
    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"
    return env


def _normalize(path: str) -> str:
    return path.replace("\\", "/")


def _run(args, *, input_text=None, check=True):
    result = subprocess.run(
        [sys.executable, *map(str, args)],
        input=input_text,
        capture_output=True,
        text=True,
        encoding="utf-8",
        env=_env(),
    )
    if check and result.returncode != 0:
        raise AssertionError(
            f"Command failed: {args}\nexit={result.returncode}\nstdout={result.stdout}\nstderr={result.stderr}"
        )
    return result


def _build_index(repo: Path, output: Path) -> dict:
    _run([BUILD_INDEX, "--repo", repo, "--output", output])
    return json.loads(output.read_text(encoding="utf-8"))


class RepoExplorerTests(unittest.TestCase):
    def test_package_registers_native_tool_extension(self):
        package_json = json.loads((SKILL_DIR.parents[1] / "package.json").read_text(encoding="utf-8"))
        extension_path = SKILL_DIR.parents[1] / "extensions" / "repo-explorer.ts"

        self.assertIn("./extensions", package_json["pi"]["extensions"])
        self.assertIn("extensions", package_json["files"])
        self.assertTrue(extension_path.exists())
        source = extension_path.read_text(encoding="utf-8")
        self.assertIn('name: "repo_explorer_explore"', source)

    def test_validator_rejects_missing_required_contract_fields(self):
        handoff_missing_index_info_and_errors = {
            "schema_version": "1.0",
            "explorer": "pathfinder",
            "timestamp": "2026-05-28T00:00:00+00:00",
            "request": {"goal": "x", "target_paths": ["/tmp/repo"], "depth": "standard"},
            "task_understanding": "x",
            "key_files": [],
            "relevant_symbols": [],
            "dependency_map": [],
            "risks_and_unknowns": [],
            "next_actions_for_caller": [],
            "evidence": [],
        }

        result = _run(
            [VALIDATE_HANDOFF, "--input", "-"],
            input_text=json.dumps(handoff_missing_index_info_and_errors),
            check=False,
        )
        self.assertNotEqual(result.returncode, 0, result.stdout)
        payload = json.loads(result.stdout)
        self.assertFalse(payload["valid"])
        self.assertIn("Missing required top-level field: index_info", payload["errors"])
        self.assertIn("Missing required top-level field: errors", payload["errors"])

    def test_validator_accepts_dash_stdin_for_valid_handoff(self):
        valid_handoff = {
            "schema_version": "1.0",
            "explorer": "pathfinder",
            "timestamp": "2026-05-28T00:00:00+00:00",
            "request": {"goal": "x", "target_paths": ["/tmp/repo"], "depth": "standard"},
            "index_info": {"index_path": "/tmp/index.json", "index_age_seconds": 0, "files_indexed": 0},
            "task_understanding": "x",
            "key_files": [],
            "relevant_symbols": [],
            "dependency_map": [],
            "risks_and_unknowns": [],
            "next_actions_for_caller": [],
            "evidence": [],
            "errors": [],
        }

        result = _run([VALIDATE_HANDOFF, "--input", "-"], input_text=json.dumps(valid_handoff))
        payload = json.loads(result.stdout)
        self.assertTrue(payload["valid"], payload)

    def test_index_includes_ci_and_safe_dotfiles_and_marks_env_sensitive(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp) / "fixture"
            (repo / ".github" / "workflows").mkdir(parents=True)
            (repo / "src").mkdir(parents=True)
            (repo / ".github" / "workflows" / "ci.yml").write_text("name: ci\n", encoding="utf-8")
            (repo / ".env").write_text("PASSWORD=super-secret-value\n", encoding="utf-8")
            (repo / ".env.example").write_text("PASSWORD=change-me\n", encoding="utf-8")
            (repo / ".gitignore").write_text("*.log\n", encoding="utf-8")
            (repo / "package.json").write_text('{"scripts":{"test":"echo ok"}}\n', encoding="utf-8")
            (repo / "src" / "auth.ts").write_text(
                "export const loginUser = async () => true;\n", encoding="utf-8"
            )

            index = _build_index(repo, repo / "index.json")
            rel_paths = {_normalize(f["relative_path"]): f for f in index["files"]}

            self.assertIn(".github/workflows/ci.yml", rel_paths)
            self.assertIn(".env", rel_paths)
            self.assertIn(".env.example", rel_paths)
            self.assertIn(".gitignore", rel_paths)
            self.assertIn("src/auth.ts", rel_paths)

            env_entry = rel_paths[".env"]
            self.assertEqual(env_entry["role"], "environment")
            self.assertTrue(env_entry.get("content_sensitive"))
            self.assertEqual(env_entry.get("hash", ""), "")
            self.assertNotIn("symbols", env_entry)

    def test_symbol_kinds_and_spans_are_normalized(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp) / "fixture"
            (repo / "src").mkdir(parents=True)
            (repo / "src" / "auth.ts").write_text(
                "export interface User { id: string }\n"
                "export const loginUser = async () => {\n"
                "  return true;\n"
                "}\n"
                "export class SessionStore {}\n",
                encoding="utf-8",
            )
            (repo / "src" / "auth.py").write_text(
                "async def authenticate_user():\n"
                "    return True\n"
                "\n"
                "class AuthService:\n"
                "    pass\n",
                encoding="utf-8",
            )

            index = _build_index(repo, repo / "index.json")
            symbols = {}
            for file_entry in index["files"]:
                for sym in file_entry.get("symbols", []):
                    symbols[sym["name"]] = sym

            self.assertEqual(symbols["User"]["kind"], "interface")
            self.assertEqual(symbols["loginUser"]["kind"], "function")
            self.assertGreaterEqual(symbols["loginUser"].get("line_end", 0), 4)
            self.assertEqual(symbols["SessionStore"]["kind"], "class")
            self.assertEqual(symbols["authenticate_user"]["kind"], "function")
            self.assertEqual(symbols["AuthService"]["kind"], "class")

    def test_extraction_prioritizes_goal_relevant_code_and_avoids_license_noise(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp) / "fixture"
            (repo / "src").mkdir(parents=True)
            (repo / "LICENSE").write_text("MIT License\n", encoding="utf-8")
            (repo / "README.md").write_text("# Fixture\n", encoding="utf-8")
            (repo / "package.json").write_text('{"name":"fixture"}\n', encoding="utf-8")
            (repo / "src" / "auth.ts").write_text(
                "import fs from 'fs';\n"
                "import { saveSession } from './session';\n"
                "export const loginUser = async () => {\n"
                "  return saveSession();\n"
                "}\n",
                encoding="utf-8",
            )
            (repo / "src" / "session.ts").write_text(
                "export function saveSession() { return true; }\n", encoding="utf-8"
            )

            index_path = repo / "index.json"
            _build_index(repo, index_path)
            result = _run([
                EXTRACT_HANDOFF,
                "--index",
                index_path,
                "--goal",
                "find auth login flow",
                "--depth",
                "standard",
                "--target-paths",
                repo,
            ])
            handoff = json.loads(result.stdout)
            key_paths = {_normalize(Path(f["path"]).relative_to(repo).as_posix()) for f in handoff["key_files"]}
            symbol_names = {s["name"] for s in handoff["relevant_symbols"]}

            self.assertIn("src/auth.ts", key_paths)
            self.assertNotIn("LICENSE", key_paths)
            dependency_targets = {d["target"] for d in handoff["dependency_map"]}

            self.assertIn("loginUser", symbol_names)
            self.assertIn("src/session.ts", dependency_targets)
            self.assertNotIn("fs", dependency_targets)
            self.assertLessEqual(len(handoff["evidence"]), 5)


if __name__ == "__main__":
    unittest.main()
