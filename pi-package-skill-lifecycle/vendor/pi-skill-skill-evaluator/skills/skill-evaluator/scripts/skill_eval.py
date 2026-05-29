#!/usr/bin/env python3
from __future__ import annotations

import argparse
import fnmatch
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "1.0"
FRONTMATTER_RE = re.compile(r"\A---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)")
NAME_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$", re.MULTILINE)
PATH_REF_RE = re.compile(r"(?<![\w./-])(?:(?:\.\.?/)+)?(?:scripts|references|assets|tests)/[A-Za-z0-9._~*/?\[\]-]+")
STOPWORDS = {
    "about",
    "agent",
    "agents",
    "also",
    "and",
    "are",
    "asks",
    "before",
    "being",
    "can",
    "code",
    "does",
    "for",
    "from",
    "has",
    "have",
    "help",
    "helps",
    "into",
    "its",
    "needs",
    "should",
    "skill",
    "skills",
    "task",
    "that",
    "the",
    "their",
    "this",
    "tool",
    "use",
    "used",
    "user",
    "when",
    "with",
    "work",
}
SPECIFICITY_HINTS = re.compile(
    r"\b(use when|use for|when to use|when the user|invoke|trigger|asks? for|mentions?|troubleshoot|review|validate|evaluate|audit|generate|deploy|refactor|research|diagnos|security|test|quality)\b",
    re.IGNORECASE,
)
VAGUE_DESCRIPTION = re.compile(
    r"\b(helps? with|useful for things|general purpose|various tasks|miscellaneous|does stuff|assistant for|helps agents?)\b",
    re.IGNORECASE,
)
CONFIRMATION_LANGUAGE = re.compile(
    r"\b(explicit (user )?(confirmation|approval)|ask before|confirm before|requires? confirmation|user approval|manual approval|plan only|dry[- ]run|do not run|never run|blocked|read-only by default|not applied automatically)\b",
    re.IGNORECASE,
)
DANGEROUS_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\brm\s+-[^\n;|&]*r[^\n;|&]*f|\brm\s+-[^\n;|&]*f[^\n;|&]*r"), "recursive force delete"),
    (re.compile(r"\bgit\s+reset\s+--hard\b"), "git reset --hard"),
    (re.compile(r"\bgit\s+clean\s+-[^\n;|&]*f"), "git clean force"),
    (re.compile(r"\bmkfs(?:\.[A-Za-z0-9_-]+)?\b"), "mkfs filesystem creation"),
    (re.compile(r"\bdd\s+(?:if=|of=)"), "dd raw disk copy"),
    (re.compile(r"\b(?:fdisk|parted|sfdisk|wipefs)\b"), "disk partition/destructive utility"),
    (re.compile(r"\bshred\b"), "secure deletion"),
    (re.compile(r"\bchmod\s+-R\s+777\b"), "recursive world-writable chmod"),
    (re.compile(r"\bchown\s+-R\b"), "recursive ownership change"),
    (re.compile(r"\bsystemctl\s+(?:poweroff|reboot|halt)\b"), "system shutdown/reboot"),
]
SECTION_GROUPS: dict[str, tuple[str, ...]] = {
    "triggers": ("when to use", "when-to-use", "triggers", "trigger", "activation", "routing", "use this skill"),
    "workflow": ("workflow", "steps", "procedure", "process", "usage", "instructions"),
    "verification": ("verification", "validation", "checks", "testing", "tests", "acceptance", "quality gate"),
    "safety": ("safety", "failure", "failure modes", "risks", "risk", "security", "boundaries", "guardrails", "caveats"),
}


@dataclass
class Issue:
    check: str
    severity: str
    message: str
    evidence: str | None = None
    recommendation: str | None = None


@dataclass
class Evaluation:
    skill_path: str
    skill_dir: str
    name: str | None
    description: str | None
    status: str
    failures: list[Issue] = field(default_factory=list)
    warnings: list[Issue] = field(default_factory=list)
    info: dict[str, Any] = field(default_factory=dict)

    def add_failure(self, check: str, message: str, *, evidence: str | None = None, recommendation: str | None = None) -> None:
        self.failures.append(Issue(check, "failure", message, evidence, recommendation))

    def add_warning(self, check: str, message: str, *, evidence: str | None = None, recommendation: str | None = None) -> None:
        self.warnings.append(Issue(check, "warning", message, evidence, recommendation))

    def finalize(self) -> None:
        if self.failures:
            self.status = "fail"
        elif self.warnings:
            self.status = "warn"
        else:
            self.status = "pass"

    def to_json(self) -> dict[str, Any]:
        return {
            "skill_path": self.skill_path,
            "skill_dir": self.skill_dir,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "failures": [issue.__dict__ for issue in self.failures],
            "warnings": [issue.__dict__ for issue in self.warnings],
            "info": self.info,
        }


@dataclass
class SkillCandidate:
    path: Path
    enabled: bool
    provenance: str
    source: str


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def strip_wrapping_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def parse_scalar(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        return ""
    if stripped[0:1] in {'"', "'"}:
        return strip_wrapping_quotes(stripped)
    return stripped.split(" #", 1)[0].strip()


def parse_frontmatter_yaml(raw: str) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for line in raw.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.startswith((" ", "\t")):
            continue
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        if key:
            parsed[key] = parse_scalar(value)
    return parsed


def normalize_heading(value: str) -> str:
    value = re.sub(r"[`*_\[\]():]", " ", value.lower())
    value = re.sub(r"\s+", " ", value).strip()
    return value


def meaningful_tokens(text: str) -> set[str]:
    tokens = re.findall(r"[a-z0-9][a-z0-9-]{2,}", text.lower())
    return {token for token in tokens if token not in STOPWORDS and len(token) >= 4}


def resolve_skill_path(input_path: str) -> Path:
    raw = input_path.strip().lstrip("@")
    path = Path(raw).expanduser()
    if path.is_dir():
        path = path / "SKILL.md"
    return path.resolve()


def rel_or_abs(path: Path, base: Path) -> str:
    try:
        return str(path.resolve().relative_to(base.resolve()))
    except ValueError:
        return str(path)


def has_matching_heading(headings: list[str], group: str) -> bool:
    needles = SECTION_GROUPS[group]
    for heading in headings:
        if any(needle in heading for needle in needles):
            return True
    return False


def check_frontmatter(evaluation: Evaluation, text: str, skill_path: Path) -> tuple[dict[str, str], str]:
    match = FRONTMATTER_RE.match(text)
    if not match:
        evaluation.add_failure(
            "frontmatter.exists",
            "SKILL.md must start with YAML frontmatter delimited by ---.",
            recommendation="Add frontmatter with at least name and description.",
        )
        return {}, text

    data = parse_frontmatter_yaml(match.group(1))
    body = text[match.end():]
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    evaluation.name = name or None
    evaluation.description = description or None

    if not name:
        evaluation.add_failure("frontmatter.name", "Frontmatter is missing required `name`.")
    elif len(name) > 64:
        evaluation.add_failure("frontmatter.name", "Skill name exceeds 64 characters.", evidence=name)
    elif not NAME_RE.match(name) or "--" in name:
        evaluation.add_failure(
            "frontmatter.name",
            "Skill name must use lowercase letters, numbers, and single hyphens, with no leading/trailing hyphen.",
            evidence=name,
        )
    elif name != skill_path.parent.name:
        evaluation.add_warning(
            "frontmatter.name_matches_directory",
            "Agent Skills recommends the skill name match the parent directory. Pi allows mismatches, so this is a warning only.",
            evidence=f"name={name}, directory={skill_path.parent.name}",
        )

    if not description:
        evaluation.add_failure("frontmatter.description", "Frontmatter is missing required non-empty `description`.")
    elif len(description) > 1024:
        evaluation.add_failure("frontmatter.description", "Description exceeds 1024 characters.")

    if "compatibility" in data and len(data["compatibility"]) > 500:
        evaluation.add_warning("frontmatter.compatibility", "Compatibility field exceeds 500 characters.")

    return data, body


def check_description(evaluation: Evaluation, description: str | None) -> None:
    if not description:
        return
    tokens = meaningful_tokens(description)
    if len(description) < 80:
        evaluation.add_warning(
            "description.specificity",
            "Description is short; routing works better when it states concrete tasks and trigger conditions.",
            evidence=description,
            recommendation="Mention what the skill does and when an agent should invoke it.",
        )
    if len(tokens) < 6:
        evaluation.add_warning(
            "description.keywords",
            "Description has few distinctive keywords for routing.",
            evidence=", ".join(sorted(tokens)) or description,
        )
    if not SPECIFICITY_HINTS.search(description):
        evaluation.add_warning(
            "description.triggers",
            "Description does not clearly say when to use or invoke the skill.",
            recommendation="Add phrases such as `Use when...`, `Invoke for...`, or specific user-request triggers.",
        )
    if VAGUE_DESCRIPTION.search(description):
        evaluation.add_warning(
            "description.vague",
            "Description contains vague routing language.",
            evidence=description,
            recommendation="Replace vague phrasing with concrete domains, actions, and prompt cues.",
        )


def check_body_sections(evaluation: Evaluation, body: str) -> None:
    headings = [normalize_heading(match.group(2)) for match in HEADING_RE.finditer(body)]
    evaluation.info["headings"] = headings
    if len(body.strip()) < 120:
        evaluation.add_warning(
            "body.instructions",
            "Skill body is very short; doc-only skills still need testable workflow instructions.",
        )
    for group in ("triggers", "workflow", "verification", "safety"):
        if not has_matching_heading(headings, group):
            evaluation.add_warning(
                f"body.section.{group}",
                f"Missing a recognizable {group} section.",
                recommendation=f"Add a `## {group.title()}` section or equivalent heading.",
            )


def check_destructive_commands(evaluation: Evaluation, text: str) -> None:
    lines = text.splitlines()
    for index, line in enumerate(lines):
        for pattern, label in DANGEROUS_PATTERNS:
            if not pattern.search(line):
                continue
            start = max(0, index - 8)
            end = min(len(lines), index + 9)
            context = "\n".join(lines[start:end])
            if CONFIRMATION_LANGUAGE.search(context):
                continue
            evaluation.add_failure(
                "safety.destructive_command_confirmation",
                f"Potentially destructive command pattern `{label}` appears without nearby explicit confirmation language.",
                evidence=f"line {index + 1}: {line.strip()}",
                recommendation="State that this command requires explicit user confirmation, dry-run first, or plan-only output.",
            )


def clean_reference(value: str) -> str:
    # Preserve leading ./ for skill-root relative paths. Stripping `.` here turns
    # ./scripts/foo into /scripts/foo, which incorrectly resolves as absolute.
    return value.strip().strip("`'\"()[]{}").rstrip(",:;")


def check_referenced_paths(evaluation: Evaluation, body: str, skill_dir: Path) -> None:
    refs = sorted({clean_reference(match.group(0)) for match in PATH_REF_RE.finditer(body)})
    valid_refs: list[str] = []
    missing_refs: list[str] = []
    skipped_refs: list[str] = []
    for ref in refs:
        if not ref:
            continue
        normalized = ref[2:] if ref.startswith("./") else ref
        if any(marker in normalized for marker in ("<", ">", "{", "}")):
            skipped_refs.append(ref)
            continue
        target = skill_dir / normalized
        if any(char in normalized for char in "*?["):
            matches = list(skill_dir.glob(normalized))
            if matches:
                valid_refs.append(ref)
            else:
                missing_refs.append(ref)
            continue
        if target.exists():
            valid_refs.append(ref)
        else:
            missing_refs.append(ref)
    evaluation.info["referenced_paths"] = valid_refs
    evaluation.info["skipped_reference_patterns"] = skipped_refs
    for ref in missing_refs:
        evaluation.add_failure(
            "references.exist",
            "SKILL.md references a bundled path that does not exist.",
            evidence=ref,
            recommendation="Create the referenced file/directory or fix the relative path from the skill root.",
        )


def load_json_file(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def check_routing_fixtures(evaluation: Evaluation, skill_dir: Path) -> None:
    candidates: list[Path] = []
    for pattern in ("tests/routing.json", "tests/routing/*.json", "tests/fixtures/*routing*.json"):
        candidates.extend(skill_dir.glob(pattern))
    candidates = sorted(set(path for path in candidates if path.is_file()))
    evaluation.info["routing_fixtures"] = [rel_or_abs(path, skill_dir) for path in candidates]
    if not candidates:
        return

    description_tokens = meaningful_tokens(evaluation.description or "")
    for fixture in candidates:
        try:
            payload = load_json_file(fixture)
        except Exception as error:  # noqa: BLE001 - CLI should report parse errors clearly.
            evaluation.add_failure("routing.fixture.parse", f"Could not parse routing fixture {rel_or_abs(fixture, skill_dir)}.", evidence=str(error))
            continue
        if not isinstance(payload, dict):
            evaluation.add_failure("routing.fixture.schema", "Routing fixture must be a JSON object.", evidence=rel_or_abs(fixture, skill_dir))
            continue
        should_trigger = payload.get("should_trigger")
        should_not_trigger = payload.get("should_not_trigger")
        if not isinstance(should_trigger, list) or not all(isinstance(item, str) for item in should_trigger):
            evaluation.add_failure("routing.fixture.should_trigger", "Routing fixture must include string array `should_trigger`.", evidence=rel_or_abs(fixture, skill_dir))
            continue
        if not isinstance(should_not_trigger, list) or not all(isinstance(item, str) for item in should_not_trigger):
            evaluation.add_failure("routing.fixture.should_not_trigger", "Routing fixture must include string array `should_not_trigger`.", evidence=rel_or_abs(fixture, skill_dir))
            continue
        if len(should_trigger) < 3:
            evaluation.add_warning("routing.fixture.coverage", "Routing fixture has fewer than 3 should-trigger prompts.", evidence=rel_or_abs(fixture, skill_dir))
        if len(should_not_trigger) < 3:
            evaluation.add_warning("routing.fixture.coverage", "Routing fixture has fewer than 3 should-not-trigger prompts.", evidence=rel_or_abs(fixture, skill_dir))
        for prompt in should_trigger:
            overlap = meaningful_tokens(prompt) & description_tokens
            if description_tokens and not overlap:
                evaluation.add_warning(
                    "routing.fixture.weak_trigger_overlap",
                    "Should-trigger prompt has no keyword overlap with the skill description; routing may be weak.",
                    evidence=prompt,
                )
        for prompt in should_not_trigger:
            overlap = meaningful_tokens(prompt) & description_tokens
            if len(overlap) >= 3:
                evaluation.add_warning(
                    "routing.fixture.possible_false_positive",
                    "Should-not-trigger prompt overlaps strongly with description keywords; review for routing ambiguity.",
                    evidence=prompt,
                )


def run_function_style_tests(test_files: list[Path], skill_dir: Path, timeout: int) -> subprocess.CompletedProcess[str]:
    runner_code = r'''
import importlib.util
import inspect
import json
import sys
import traceback
from pathlib import Path

paths = [Path(item) for item in json.loads(sys.argv[1])]
passed = 0
failed = 0
skipped = 0
for path in paths:
    module_name = "skill_eval_test_" + str(abs(hash(str(path))))
    try:
        spec = importlib.util.spec_from_file_location(module_name, path)
        if spec is None or spec.loader is None:
            raise RuntimeError(f"could not load spec for {path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    except Exception:
        failed += 1
        print(f"ERROR: importing {path}")
        traceback.print_exc()
        continue
    for name, obj in sorted(vars(module).items()):
        if not name.startswith("test_") or not callable(obj):
            continue
        try:
            signature = inspect.signature(obj)
        except (TypeError, ValueError):
            signature = None
        if signature is not None:
            required = [
                parameter for parameter in signature.parameters.values()
                if parameter.default is inspect.Parameter.empty
                and parameter.kind in (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Parameter.KEYWORD_ONLY)
            ]
            if required:
                skipped += 1
                print(f"SKIP: {path.name}::{name} requires unsupported fixtures/arguments")
                continue
        try:
            obj()
            passed += 1
            print(f"PASS: {path.name}::{name}")
        except Exception:
            failed += 1
            print(f"FAIL: {path.name}::{name}")
            traceback.print_exc()
print(f"FUNCTION_TEST_RESULTS: {passed} passed, {failed} failed, {skipped} skipped")
if failed:
    sys.exit(1)
if passed == 0:
    sys.exit(5)
sys.exit(0)
'''
    return subprocess.run(
        [sys.executable, "-c", runner_code, json.dumps([str(path) for path in test_files])],
        cwd=skill_dir,
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=timeout,
        env={**os.environ, "PYTHONUTF8": "1"},
        check=False,
    )


def unittest_ran_zero_tests(result: subprocess.CompletedProcess[str]) -> bool:
    combined = f"{result.stdout}\n{result.stderr}"
    return "Ran 0 tests" in combined or "NO TESTS RAN" in combined


def run_skill_tests(evaluation: Evaluation, skill_dir: Path, *, skip_tests: bool, timeout: int) -> None:
    tests_dir = skill_dir / "tests"
    evaluation.info["has_tests"] = tests_dir.is_dir()
    evaluation.info["has_scripts"] = (skill_dir / "scripts").is_dir()
    evaluation.info["has_references"] = (skill_dir / "references").is_dir()
    if not tests_dir.is_dir():
        return
    if skip_tests:
        evaluation.add_warning("tests.skipped", "Tests directory exists but test execution was skipped.")
        return

    test_files = sorted(tests_dir.rglob("test*.py"))
    if not test_files:
        evaluation.add_warning("tests.discover", "Tests directory exists but no `test*.py` files were found.")
        return

    command = [sys.executable, "-m", "unittest", "discover", "-s", str(tests_dir)]
    try:
        result = subprocess.run(
            command,
            cwd=skill_dir,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=timeout,
            env={**os.environ, "PYTHONUTF8": "1"},
            check=False,
        )
    except subprocess.TimeoutExpired as error:
        evaluation.add_failure(
            "tests.timeout",
            f"Skill tests timed out after {timeout}s.",
            evidence=str(error),
            recommendation="Make tests bounded, deterministic, and quick enough for quality gates.",
        )
        return

    evaluation.info["test_command"] = " ".join(command)
    evaluation.info["test_runner"] = "unittest"
    evaluation.info["test_exit_code"] = result.returncode
    evaluation.info["test_stdout_tail"] = result.stdout[-4000:]
    evaluation.info["test_stderr_tail"] = result.stderr[-4000:]

    if result.returncode == 0 and not unittest_ran_zero_tests(result):
        return

    if unittest_ran_zero_tests(result):
        try:
            fallback = run_function_style_tests(test_files, skill_dir, timeout)
        except subprocess.TimeoutExpired as error:
            evaluation.add_failure(
                "tests.timeout",
                f"Function-style skill tests timed out after {timeout}s.",
                evidence=str(error),
                recommendation="Make tests bounded, deterministic, and quick enough for quality gates.",
            )
            return
        evaluation.info["test_runner"] = "python-function-fallback"
        evaluation.info["test_command"] = f"{sys.executable} -c <function-style test runner>"
        evaluation.info["test_exit_code"] = fallback.returncode
        evaluation.info["test_stdout_tail"] = fallback.stdout[-4000:]
        evaluation.info["test_stderr_tail"] = fallback.stderr[-4000:]
        if fallback.returncode == 0:
            return
        if fallback.returncode == 5:
            evaluation.add_warning(
                "tests.discover",
                "Tests directory has test*.py files, but neither unittest nor simple no-argument test functions were discovered.",
                evidence=(fallback.stdout + fallback.stderr)[-4000:],
            )
            return
        evaluation.add_failure(
            "tests.run",
            "Function-style skill tests failed.",
            evidence=(fallback.stdout + fallback.stderr)[-4000:],
            recommendation="Fix failing tests or use standard unittest tests for portable quality gates.",
        )
        return

    evaluation.add_failure(
        "tests.run",
        "Skill tests failed.",
        evidence=(result.stdout + result.stderr)[-4000:],
        recommendation="Fix failing tests or mark non-applicable checks explicitly.",
    )


def evaluate_skill(skill_path: Path, *, skip_tests: bool = False, test_timeout: int = 60) -> Evaluation:
    skill_path = resolve_skill_path(str(skill_path))
    evaluation = Evaluation(
        skill_path=str(skill_path),
        skill_dir=str(skill_path.parent),
        name=None,
        description=None,
        status="fail",
    )
    if not skill_path.exists():
        evaluation.add_failure("skill_path.exists", "Skill path does not exist.", evidence=str(skill_path))
        evaluation.finalize()
        return evaluation
    if skill_path.name != "SKILL.md" and skill_path.suffix.lower() != ".md":
        evaluation.add_warning("skill_path.name", "Skill path is not named SKILL.md; Pi supports root .md skills in some locations only.")

    try:
        text = skill_path.read_text(encoding="utf-8")
    except Exception as error:  # noqa: BLE001 - preserve readable CLI error.
        evaluation.add_failure("skill_path.read", "Could not read skill file.", evidence=str(error))
        evaluation.finalize()
        return evaluation

    _frontmatter, body = check_frontmatter(evaluation, text, skill_path)
    check_description(evaluation, evaluation.description)
    check_body_sections(evaluation, body)
    check_destructive_commands(evaluation, text)
    check_referenced_paths(evaluation, body, skill_path.parent)
    check_routing_fixtures(evaluation, skill_path.parent)
    run_skill_tests(evaluation, skill_path.parent, skip_tests=skip_tests, timeout=test_timeout)
    evaluation.finalize()
    return evaluation


def issue_counts(evaluations: list[Evaluation]) -> dict[str, int]:
    return {
        "evaluated": len(evaluations),
        "passed": sum(1 for item in evaluations if item.status == "pass"),
        "warned": sum(1 for item in evaluations if item.status == "warn"),
        "failed": sum(1 for item in evaluations if item.status == "fail"),
        "hard_failures": sum(len(item.failures) for item in evaluations),
        "warnings": sum(len(item.warnings) for item in evaluations),
    }


def recommendation_for(evaluation: Evaluation) -> str:
    if evaluation.failures:
        return "Fix blocking failures before enabling, publishing, or relying on this skill."
    if evaluation.warnings:
        return "Usable with caveats; address warnings to improve routing and maintainability."
    return "Meets the evaluator MVP contract."


def make_report(evaluations: list[Evaluation], *, scope: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": now_iso(),
        "scope": scope,
        "summary": issue_counts(evaluations),
        "skills": [item.to_json() | {"recommendation": recommendation_for(item)} for item in evaluations],
    }


def format_issue(issue: dict[str, Any]) -> str:
    text = f"- `{issue['check']}`: {issue['message']}"
    if issue.get("evidence"):
        evidence = str(issue["evidence"]).replace("\n", "\n  ")
        text += f"\n  - Evidence: {evidence}"
    if issue.get("recommendation"):
        text += f"\n  - Recommendation: {issue['recommendation']}"
    return text


def format_markdown(report: dict[str, Any]) -> str:
    summary = report["summary"]
    lines = [
        "# Skill Evaluation Report",
        "",
        f"Generated: {report['generated_at']}",
        f"Schema: {report['schema_version']}",
        "",
        "## Summary",
        "",
        f"- Evaluated: {summary['evaluated']}",
        f"- Passed: {summary['passed']}",
        f"- Warned: {summary['warned']}",
        f"- Failed: {summary['failed']}",
        f"- Hard failures: {summary['hard_failures']}",
        f"- Warnings: {summary['warnings']}",
        "",
        "## Results",
        "",
        "| Skill | Status | Failures | Warnings | Path |",
        "| --- | --- | ---: | ---: | --- |",
    ]
    for skill in report["skills"]:
        name = skill.get("name") or "(unknown)"
        lines.append(
            f"| `{name}` | **{skill['status']}** | {len(skill['failures'])} | {len(skill['warnings'])} | `{skill['skill_path']}` |"
        )

    for skill in report["skills"]:
        name = skill.get("name") or "(unknown)"
        lines.extend(["", f"## {name}", "", f"- Status: **{skill['status']}**", f"- Path: `{skill['skill_path']}`"])
        if skill.get("description"):
            lines.append(f"- Description: {skill['description']}")
        lines.append(f"- Recommendation: {skill['recommendation']}")
        info = skill.get("info", {})
        lines.append(
            f"- Assets: tests={bool(info.get('has_tests'))}, scripts={bool(info.get('has_scripts'))}, references={bool(info.get('has_references'))}"
        )
        if info.get("test_exit_code") is not None:
            lines.append(f"- Test exit code: {info['test_exit_code']}")
        if skill["failures"]:
            lines.extend(["", "### Blocking failures", ""])
            lines.extend(format_issue(issue) for issue in skill["failures"])
        if skill["warnings"]:
            lines.extend(["", "### Warnings", ""])
            lines.extend(format_issue(issue) for issue in skill["warnings"])
        if not skill["failures"] and not skill["warnings"]:
            lines.extend(["", "No failures or warnings."])
    return "\n".join(lines) + "\n"


def expand_tilde(value: str) -> str:
    if value == "~":
        return str(Path.home())
    if value.startswith("~/"):
        return str(Path.home() / value[2:])
    return value


def resolve_configured_path(value: str, base_dir: Path) -> Path:
    expanded = expand_tilde(value)
    path = Path(expanded)
    if path.is_absolute():
        return path.resolve()
    return (base_dir / path).resolve()


def get_agent_dir(explicit_agent_dir: str | None = None) -> Path:
    if explicit_agent_dir:
        return Path(explicit_agent_dir).expanduser().resolve()
    env = os.environ.get("PI_CODING_AGENT_DIR")
    if env:
        return Path(env).expanduser().resolve()
    return Path.home() / ".pi" / "agent"


def read_json_if_exists(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return payload if isinstance(payload, dict) else {}


def package_source(entry: Any) -> str | None:
    if isinstance(entry, str):
        return entry
    if isinstance(entry, dict) and isinstance(entry.get("source"), str):
        return entry["source"]
    return None


def package_skill_filter(entry: Any) -> list[str] | None:
    if isinstance(entry, dict) and isinstance(entry.get("skills"), list):
        return [str(item) for item in entry["skills"]]
    return None


def strip_npm_version(spec: str) -> str:
    if spec.startswith("@"):
        index = spec.rfind("@")
        return spec[:index] if index > 0 else spec
    index = spec.rfind("@")
    return spec[:index] if index > 0 else spec


def strip_git_ref(spec: str) -> str:
    marker = spec.rfind("@")
    slash = max(spec.rfind("/"), spec.rfind(":"))
    if marker > slash:
        return spec[:marker]
    return spec


def resolve_package_dir(source: str, settings_dir: Path, agent_dir: Path) -> Path | None:
    if source.startswith("npm:"):
        name = strip_npm_version(source[4:])
        return agent_dir / "npm" / "node_modules" / Path(*name.split("/"))
    raw = source
    if raw.startswith("git:"):
        raw = raw[4:]
    if raw.startswith(("http://", "https://", "ssh://")) or re.match(r"^[^/]+\.[^/]+/", raw):
        no_ref = strip_git_ref(raw)
        no_proto = re.sub(r"^[a-z]+://", "", no_ref)
        no_proto = no_proto.replace(":", "/", 1) if no_proto.startswith("git@") else no_proto
        return agent_dir / "git" / Path(*[part for part in no_proto.split("/") if part])
    return resolve_configured_path(source, settings_dir)


def discover_skill_files(root: Path, *, include_root_md: bool = True) -> list[Path]:
    if not root.exists():
        return []
    files = sorted(path.resolve() for path in root.rglob("SKILL.md") if path.is_file())
    if include_root_md:
        files.extend(sorted(path.resolve() for path in root.glob("*.md") if path.is_file() and path.name != "SKILL.md"))
    return sorted(set(files))


def candidate_name(skill_path: Path) -> str | None:
    try:
        text = skill_path.read_text(encoding="utf-8")
    except Exception:
        return None
    match = FRONTMATTER_RE.match(text)
    if not match:
        return None
    return parse_frontmatter_yaml(match.group(1)).get("name")


def filter_matches_skill(pattern: str, skill_path: Path, base_dir: Path, name: str | None = None) -> bool:
    normalized = pattern[1:] if pattern.startswith(("+", "-", "!")) else pattern
    normalized = normalized.strip()
    if not normalized:
        return False
    if normalized == "**":
        return True
    if name and normalized == name:
        return True
    path_options = {str(skill_path), str(skill_path.parent)}
    try:
        path_options.add(str(skill_path.relative_to(base_dir)))
        path_options.add(str(skill_path.parent.relative_to(base_dir)))
    except ValueError:
        pass
    if any(char in normalized for char in "*?["):
        return any(fnmatch.fnmatch(option.replace("\\", "/"), normalized.replace("\\", "/")) for option in path_options)
    try:
        resolved = str(resolve_configured_path(normalized, base_dir))
        if resolved in path_options:
            return True
    except Exception:
        pass
    normalized_path = normalized.replace("\\", "/")
    return any(option.replace("\\", "/") == normalized_path for option in path_options)


def root_skill_enabled(skill_path: Path, settings_skills: list[str], settings_dir: Path) -> bool:
    if not settings_skills:
        return True
    enabled = True
    name = candidate_name(skill_path)
    for raw in settings_skills:
        entry = str(raw).strip()
        if not entry:
            continue
        if entry in {"!**", "-**"}:
            enabled = False
            continue
        if entry.startswith("+"):
            if filter_matches_skill(entry, skill_path, settings_dir, name):
                enabled = True
            continue
        if entry.startswith(("!", "-")):
            if filter_matches_skill(entry, skill_path, settings_dir, name):
                enabled = False
            continue
        if filter_matches_skill(entry, skill_path, settings_dir, name):
            enabled = True
    return enabled


def package_skill_enabled(skill_path: Path, package_dir: Path, filters: list[str] | None) -> bool:
    if filters is None:
        return True
    if not filters:
        return False
    name = candidate_name(skill_path)
    positives = [item for item in filters if not str(item).startswith(("!", "-"))]
    enabled = False if positives else True
    for raw in filters:
        entry = str(raw).strip()
        if not entry:
            continue
        if entry.startswith("+"):
            if filter_matches_skill(entry, skill_path, package_dir, name):
                enabled = True
        elif entry.startswith(("!", "-")):
            if filter_matches_skill(entry, skill_path, package_dir, name):
                enabled = False
        elif filter_matches_skill(entry, skill_path, package_dir, name):
            enabled = True
    return enabled


def discover_package_skill_files(package_dir: Path) -> list[Path]:
    package_json = read_json_if_exists(package_dir / "package.json")
    pi_manifest = package_json.get("pi") if isinstance(package_json.get("pi"), dict) else {}
    skill_entries = pi_manifest.get("skills") if isinstance(pi_manifest, dict) else None
    if not isinstance(skill_entries, list) or not skill_entries:
        skill_entries = ["skills"]
    out: list[Path] = []
    for entry in skill_entries:
        value = str(entry)
        if value.startswith("!"):
            continue
        value = value[1:] if value.startswith("+") else value
        target = package_dir / value
        if any(char in value for char in "*?["):
            for match in package_dir.glob(value):
                if match.is_dir():
                    out.extend(discover_skill_files(match))
                elif match.is_file() and (match.name == "SKILL.md" or match.suffix.lower() == ".md"):
                    out.append(match.resolve())
        elif target.is_dir():
            out.extend(discover_skill_files(target))
        elif target.is_file() and (target.name == "SKILL.md" or target.suffix.lower() == ".md"):
            out.append(target.resolve())
    return sorted(set(out))


def discover_project_skill_roots(cwd: Path) -> list[Path]:
    roots: list[Path] = []
    current = cwd.resolve()
    while True:
        roots.append(current / ".pi" / "skills")
        roots.append(current / ".agents" / "skills")
        if (current / ".git").exists():
            break
        parent = current.parent
        if parent == current:
            break
        current = parent
    return roots


def discover_skills(
    *,
    cwd: Path,
    agent_dir: Path,
    include_settings: bool,
    enabled_only: bool,
    extra_roots: list[Path],
) -> tuple[list[SkillCandidate], list[str]]:
    candidates: dict[str, SkillCandidate] = {}
    warnings: list[str] = []
    settings = read_json_if_exists(agent_dir / "settings.json") if include_settings else {}
    settings_dir = agent_dir
    settings_skills = [str(item) for item in settings.get("skills", [])] if isinstance(settings.get("skills"), list) else []

    root_specs: list[tuple[Path, str]] = [
        (agent_dir / "skills", "global ~/.pi/agent/skills"),
        (Path.home() / ".agents" / "skills", "global ~/.agents/skills"),
        *[(root, "project skill root") for root in discover_project_skill_roots(cwd)],
        *[(root.expanduser().resolve(), "explicit --skill-root") for root in extra_roots],
    ]
    for root, provenance in root_specs:
        for path in discover_skill_files(root):
            enabled = True if provenance == "explicit --skill-root" and not include_settings else root_skill_enabled(path, settings_skills, settings_dir)
            if enabled_only and not enabled:
                continue
            candidates[str(path)] = SkillCandidate(path=path, enabled=enabled, provenance=provenance, source=str(root))

    if include_settings:
        for raw in settings_skills:
            entry = str(raw).strip()
            if not entry or entry.startswith(("!", "-")) or any(char in entry for char in "*?["):
                continue
            entry = entry[1:] if entry.startswith("+") else entry
            target = resolve_configured_path(entry, settings_dir)
            for path in discover_skill_files(target) if target.is_dir() else ([target.resolve()] if target.is_file() else []):
                enabled = root_skill_enabled(path, settings_skills, settings_dir)
                if enabled_only and not enabled:
                    continue
                candidates[str(path)] = SkillCandidate(path=path, enabled=enabled, provenance="settings.skills", source=entry)

        for package_entry in settings.get("packages", []) if isinstance(settings.get("packages"), list) else []:
            source = package_source(package_entry)
            if not source:
                continue
            package_dir = resolve_package_dir(source, settings_dir, agent_dir)
            if not package_dir or not package_dir.exists():
                warnings.append(f"Could not resolve package source: {source}")
                continue
            filters = package_skill_filter(package_entry)
            for path in discover_package_skill_files(package_dir):
                enabled = package_skill_enabled(path, package_dir, filters)
                if enabled_only and not enabled:
                    continue
                candidates[str(path)] = SkillCandidate(path=path, enabled=enabled, provenance="settings.packages", source=source)

    return sorted(candidates.values(), key=lambda item: (candidate_name(item.path) or item.path.name, str(item.path))), warnings


def write_report_outputs(report: dict[str, Any], args: argparse.Namespace) -> None:
    json_text = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    markdown_text = format_markdown(report)
    if getattr(args, "json_output", None):
        Path(args.json_output).expanduser().write_text(json_text, encoding="utf-8")
    if getattr(args, "markdown_output", None):
        Path(args.markdown_output).expanduser().write_text(markdown_text, encoding="utf-8")
    if args.format == "json":
        sys.stdout.write(json_text)
    else:
        sys.stdout.write(markdown_text)


def command_run(args: argparse.Namespace) -> int:
    evaluation = evaluate_skill(resolve_skill_path(args.skill_path), skip_tests=args.skip_tests, test_timeout=args.test_timeout)
    report = make_report([evaluation], scope={"mode": "single", "input": args.skill_path})
    write_report_outputs(report, args)
    return 1 if report["summary"]["hard_failures"] else 0


def command_all(args: argparse.Namespace) -> int:
    cwd = Path(args.cwd).expanduser().resolve() if args.cwd else Path.cwd().resolve()
    agent_dir = get_agent_dir(args.agent_dir)
    extra_roots = [Path(root).expanduser().resolve() for root in args.skill_root]
    candidates, discovery_warnings = discover_skills(
        cwd=cwd,
        agent_dir=agent_dir,
        include_settings=not args.no_settings,
        enabled_only=args.enabled_only,
        extra_roots=extra_roots,
    )
    evaluations = [evaluate_skill(candidate.path, skip_tests=args.skip_tests, test_timeout=args.test_timeout) for candidate in candidates]
    by_path = {item.skill_path: item for item in evaluations}
    for candidate in candidates:
        evaluation = by_path.get(str(candidate.path.resolve()))
        if evaluation:
            evaluation.info["enabled"] = candidate.enabled
            evaluation.info["provenance"] = candidate.provenance
            evaluation.info["source"] = candidate.source
    report = make_report(
        evaluations,
        scope={
            "mode": "all",
            "cwd": str(cwd),
            "agent_dir": str(agent_dir),
            "enabled_only": args.enabled_only,
            "include_settings": not args.no_settings,
            "extra_roots": [str(root) for root in extra_roots],
            "discovery_warnings": discovery_warnings,
        },
    )
    write_report_outputs(report, args)
    return 1 if report["summary"]["hard_failures"] else 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Evaluate Pi/Agent Skills contracts.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    def add_output_args(subparser: argparse.ArgumentParser) -> None:
        subparser.add_argument("--format", choices=("markdown", "json"), default="markdown", help="Format to write to stdout.")
        subparser.add_argument("--json-output", help="Optional path to also write the JSON report.")
        subparser.add_argument("--markdown-output", help="Optional path to also write the Markdown report.")
        subparser.add_argument("--skip-tests", action="store_true", help="Do not execute tests found under skill tests/ directories.")
        subparser.add_argument("--test-timeout", type=int, default=60, help="Per-skill test timeout in seconds. Default: 60.")

    run_parser = subparsers.add_parser("run", help="Evaluate one skill path or directory.")
    run_parser.add_argument("skill_path", help="Path to SKILL.md or to a skill directory. Leading @ is accepted.")
    add_output_args(run_parser)
    run_parser.set_defaults(func=command_run)

    all_parser = subparsers.add_parser("all", help="Evaluate discovered skills.")
    all_parser.add_argument("--enabled-only", action="store_true", help="Only evaluate skills that appear enabled by Pi settings filters.")
    all_parser.add_argument("--cwd", help="Project cwd used for project skill discovery. Defaults to current directory.")
    all_parser.add_argument("--agent-dir", help="Override Pi agent directory. Defaults to PI_CODING_AGENT_DIR or ~/.pi/agent.")
    all_parser.add_argument("--skill-root", action="append", default=[], help="Additional skill root to discover. Repeatable.")
    all_parser.add_argument("--no-settings", action="store_true", help="Ignore Pi settings and evaluate only default/explicit roots.")
    add_output_args(all_parser)
    all_parser.set_defaults(func=command_all)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
