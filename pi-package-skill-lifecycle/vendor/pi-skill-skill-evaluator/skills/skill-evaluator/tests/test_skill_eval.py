import json
import os
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parents[1]
SCRIPT = SKILL_DIR / "scripts" / "skill_eval.py"


def run_cli(args, *, home: Path, check: bool = True):
    env = os.environ.copy()
    env["HOME"] = str(home)
    env["PYTHONUTF8"] = "1"
    result = subprocess.run(
        [sys.executable, str(SCRIPT), *map(str, args)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        env=env,
        check=False,
    )
    if check and result.returncode != 0:
        raise AssertionError(
            f"Command failed: {args}\nexit={result.returncode}\nstdout={result.stdout}\nstderr={result.stderr}"
        )
    return result


def write_valid_skill(root: Path, name: str = "example-skill") -> Path:
    skill = root / name
    (skill / "scripts").mkdir(parents=True)
    (skill / "tests").mkdir(parents=True)
    (skill / "scripts" / "helper.py").write_text("print('ok')\n", encoding="utf-8")
    (skill / "tests" / "test_skill_contract.py").write_text(
        "import unittest\n\nclass Contract(unittest.TestCase):\n    def test_true(self):\n        self.assertTrue(True)\n",
        encoding="utf-8",
    )
    (skill / "SKILL.md").write_text(
        textwrap.dedent(
            f"""
            ---
            name: {name}
            description: Evaluate example skill packages for contract checks, routing quality, referenced scripts, safety boundaries, and test execution. Use when reviewing an example skill before enabling it.
            ---

            # Example Skill

            ## When to Use

            Use when reviewing an example skill package before enabling or publishing it.

            ## Workflow

            Run the helper script if needed:

            ```bash
            python scripts/helper.py
            ```

            ## Verification

            Run the bundled tests with Python unittest.

            ## Safety

            This skill is read-only by default and does not mutate user files.
            """
        ).lstrip(),
        encoding="utf-8",
    )
    return skill / "SKILL.md"


class SkillEvaluatorTests(unittest.TestCase):
    def test_package_registers_skill_and_native_tools_extension(self):
        package_json = json.loads((SKILL_DIR.parents[1] / "package.json").read_text(encoding="utf-8"))
        extension_path = SKILL_DIR.parents[1] / "extensions" / "skill-evaluator.ts"

        self.assertIn("./skills", package_json["pi"]["skills"])
        self.assertIn("./extensions", package_json["pi"]["extensions"])
        self.assertIn("skill_eval_run", package_json["bin"])
        self.assertIn("skill_eval_all", package_json["bin"])
        self.assertTrue(extension_path.exists())
        source = extension_path.read_text(encoding="utf-8")
        self.assertIn('name: "skill_eval_run"', source)
        self.assertIn('name: "skill_eval_all"', source)

    def test_valid_skill_returns_json_and_markdown_without_issues(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp) / "home"
            home.mkdir()
            skill_path = write_valid_skill(Path(tmp) / "skills")
            json_out = Path(tmp) / "report.json"
            md_out = Path(tmp) / "report.md"

            result = run_cli(
                ["run", skill_path, "--format", "json", "--json-output", json_out, "--markdown-output", md_out],
                home=home,
            )

            payload = json.loads(result.stdout)
            self.assertEqual(payload["summary"]["failed"], 0)
            self.assertEqual(payload["summary"]["warnings"], 0)
            self.assertEqual(payload["skills"][0]["status"], "pass")
            self.assertTrue(json_out.exists())
            self.assertIn("# Skill Evaluation Report", md_out.read_text(encoding="utf-8"))

    def test_function_style_tests_without_unittest_are_supported(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp) / "home"
            home.mkdir()
            skill_path = write_valid_skill(Path(tmp) / "skills")
            test_file = skill_path.parent / "tests" / "test_skill_contract.py"
            test_file.write_text("def test_plain_function():\n    assert 2 + 2 == 4\n", encoding="utf-8")

            result = run_cli(["run", skill_path, "--format", "json"], home=home)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["summary"]["failed"], 0)
            self.assertEqual(payload["skills"][0]["info"]["test_runner"], "python-function-fallback")

    def test_invalid_skill_exits_nonzero_with_blocking_failures(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp) / "home"
            home.mkdir()
            skill = Path(tmp) / "bad-skill"
            skill.mkdir()
            (skill / "SKILL.md").write_text(
                textwrap.dedent(
                    """
                    ---
                    name: Bad Skill
                    ---

                    # Bad Skill

                    ## Workflow

                    Run `scripts/missing.py` and then `rm -rf /tmp/example`.
                    """
                ).lstrip(),
                encoding="utf-8",
            )

            result = run_cli(["run", skill / "SKILL.md", "--format", "json", "--skip-tests"], home=home, check=False)
            self.assertNotEqual(result.returncode, 0)
            payload = json.loads(result.stdout)
            checks = {issue["check"] for issue in payload["skills"][0]["failures"]}
            self.assertIn("frontmatter.name", checks)
            self.assertIn("frontmatter.description", checks)
            self.assertIn("references.exist", checks)
            self.assertIn("safety.destructive_command_confirmation", checks)

    def test_all_discovers_explicit_skill_root_without_user_settings(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp) / "home"
            home.mkdir()
            project = Path(tmp) / "project"
            project.mkdir()
            agent_dir = Path(tmp) / "agent"
            agent_dir.mkdir()
            root = Path(tmp) / "skill-root"
            write_valid_skill(root, "first-skill")
            write_valid_skill(root, "second-skill")

            result = run_cli(
                [
                    "all",
                    "--no-settings",
                    "--enabled-only",
                    "--cwd",
                    project,
                    "--agent-dir",
                    agent_dir,
                    "--skill-root",
                    root,
                    "--format",
                    "json",
                ],
                home=home,
            )
            payload = json.loads(result.stdout)
            self.assertEqual(payload["summary"]["evaluated"], 2)
            self.assertEqual(payload["summary"]["failed"], 0)
            self.assertEqual({skill["name"] for skill in payload["skills"]}, {"first-skill", "second-skill"})

    def test_malformed_routing_fixture_is_blocking(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp) / "home"
            home.mkdir()
            skill_path = write_valid_skill(Path(tmp) / "skills")
            routing_dir = skill_path.parent / "tests" / "routing"
            routing_dir.mkdir()
            (routing_dir / "bad.json").write_text('{"should_trigger": "not an array"}', encoding="utf-8")

            result = run_cli(["run", skill_path, "--format", "json"], home=home, check=False)
            self.assertNotEqual(result.returncode, 0)
            payload = json.loads(result.stdout)
            checks = {issue["check"] for issue in payload["skills"][0]["failures"]}
            self.assertIn("routing.fixture.should_trigger", checks)


if __name__ == "__main__":
    unittest.main()
