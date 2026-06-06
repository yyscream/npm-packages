from pathlib import Path
import re
import unittest


SKILL_DIR = Path(__file__).resolve().parents[1]
SKILL_MD = SKILL_DIR / "SKILL.md"
REFERENCE_MD = SKILL_DIR / "references" / "dolt-guide.md"


class DoltSkillContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.skill_text = SKILL_MD.read_text(encoding="utf-8")
        cls.reference_text = REFERENCE_MD.read_text(encoding="utf-8")

    def test_frontmatter_is_portable_and_specific(self):
        self.assertTrue(self.skill_text.startswith("---\n"))
        frontmatter = self.skill_text.split("---", 2)[1]
        self.assertRegex(frontmatter, r"(?m)^name: dolt-database-version-control$")
        self.assertRegex(frontmatter, r"(?m)^description: .+Dolt.+version")
        self.assertRegex(frontmatter, r"(?m)^license: MIT$")
        description = re.search(r"(?m)^description: (.+)$", frontmatter).group(1)
        self.assertLessEqual(len(description), 1024)

    def test_required_sections_exist(self):
        for heading in [
            "## When to use",
            "## Inputs and assumptions",
            "## Portable workflow",
            "## Safety and side effects",
            "## Scripts, references, and dependencies",
            "## Verification",
        ]:
            with self.subTest(heading=heading):
                self.assertIn(heading, self.skill_text)

    def test_dolt_operational_concepts_are_present(self):
        for phrase in [
            "MySQL-compatible",
            "versioned replica",
            "DOLT_COMMIT",
            "dolt_diff",
            "branch",
            "merge",
            "immutable history",
        ]:
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.skill_text)

    def test_reference_exists_and_has_primary_sources(self):
        self.assertTrue(REFERENCE_MD.exists())
        for url in [
            "https://docs.dolthub.com/introduction/getting-started/database",
            "https://docs.dolthub.com/introduction/getting-started/git-for-data",
            "https://docs.dolthub.com/sql-reference/version-control",
            "https://github.com/dolthub/dolt",
        ]:
            with self.subTest(url=url):
                self.assertIn(url, self.reference_text)

    def test_no_private_paths_or_secret_markers(self):
        combined = self.skill_text + "\n" + self.reference_text
        private_home_pattern = r"/home/" + "firstpick"
        forbidden_patterns = [
            private_home_pattern,
            r"BEGIN RSA PRIVATE KEY",
            r"BEGIN OPENSSH PRIVATE KEY",
            r"api[_-]?key\s*=",
            r"token\s*=",
        ]
        for pattern in forbidden_patterns:
            with self.subTest(pattern=pattern):
                self.assertIsNone(re.search(pattern, combined, flags=re.IGNORECASE))


if __name__ == "__main__":
    unittest.main()
