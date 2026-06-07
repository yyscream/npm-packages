import re
import unittest
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parents[1]
PACKAGE_ROOT = SKILL_DIR.parents[1]
SKILL = SKILL_DIR / "SKILL.md"
THEME_SPEC = SKILL_DIR / "references" / "THEME-SPEC.md"
ASSETS = SKILL_DIR / "assets"


class LabQcPresentationThemeContractTests(unittest.TestCase):
    def test_skill_frontmatter_and_required_sections(self):
        text = SKILL.read_text(encoding="utf-8")
        self.assertRegex(
            text,
            r"^---\s*\n[\s\S]*?name:\s*lab-qc-presentation-theme[\s\S]*?description:\s*.+[\s\S]*?\n---",
            "missing valid frontmatter",
        )
        for section in [
            "## When to Use",
            "## Inputs and Assumptions",
            "## Portable Workflow",
            "## Safety and Side Effects",
            "## Scripts, References, and Dependencies",
            "## Verification",
        ]:
            self.assertIn(section, text)

    def test_audience_and_scope_are_explicit(self):
        text = SKILL.read_text(encoding="utf-8").lower()
        for phrase in [
            "laboratory technician",
            "scientist",
            "quality-control teamleader",
            "chemical production quality control laboratory",
            "do not import facts or sections from earlier decks",
        ]:
            self.assertIn(phrase, text)

    def test_generated_outputs_default_to_german(self):
        skill = SKILL.read_text(encoding="utf-8")
        theme = THEME_SPEC.read_text(encoding="utf-8")
        template = (ASSETS / "starter-template.html").read_text(encoding="utf-8")
        js = (ASSETS / "lab-qc-deck.js").read_text(encoding="utf-8")

        for text in [skill, theme]:
            self.assertIn("German", text)
            self.assertIn("generated documentation", text)

        for phrase in [
            'lang="de"',
            "Präsentationssteuerung",
            "Übersicht",
            "Notizen",
            "Schließen",
            "Labortechnik",
        ]:
            self.assertIn(phrase, template)

        self.assertIn("Folie", js)

    def test_theme_assets_exist_and_capture_green_lab_style(self):
        expected = [
            ASSETS / "starter-template.html",
            ASSETS / "lab-qc-theme.css",
            ASSETS / "lab-qc-deck.js",
            THEME_SPEC,
        ]
        for path in expected:
            self.assertTrue(path.exists(), f"missing {path.relative_to(SKILL_DIR)}")

        css = (ASSETS / "lab-qc-theme.css").read_text(encoding="utf-8")
        for token in ["--green-900", "--green-700", "--mint-100", "molecule", "@media print"]:
            self.assertIn(token, css)

        js = (ASSETS / "lab-qc-deck.js").read_text(encoding="utf-8")
        for token in ["ArrowRight", "overview", "show-notes", "window.print"]:
            self.assertIn(token, js)

    def test_package_texts_do_not_contain_private_home_paths(self):
        pattern = re.compile(r"/(home|Users)/[A-Za-z0-9._-]+")
        for path in PACKAGE_ROOT.rglob("*"):
            if path.is_file() and path.suffix in {".md", ".json", ".html", ".css", ".js", ".py"}:
                text = path.read_text(encoding="utf-8")
                self.assertIsNone(pattern.search(text), f"private path in {path.relative_to(PACKAGE_ROOT)}")


if __name__ == "__main__":
    unittest.main()
