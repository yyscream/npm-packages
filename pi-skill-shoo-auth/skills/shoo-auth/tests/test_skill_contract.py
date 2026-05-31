import re
import unittest
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parents[1]
SKILL = SKILL_DIR / "SKILL.md"
REFERENCE = SKILL_DIR / "references" / "shoo-docs-summary.md"


class ShooAuthSkillContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = SKILL.read_text(encoding="utf-8")

    def test_frontmatter_is_valid_and_specific(self):
        match = re.match(r"^---\n(?P<fm>[\s\S]*?)\n---\n", self.text)
        self.assertIsNotNone(match, "missing frontmatter")
        fm = match.group("fm")
        self.assertIsNotNone(re.search(r"^name:\s*shoo-auth$", fm, re.MULTILINE), "missing expected skill name")
        desc_match = re.search(r"^description:\s*(.+)$", fm, re.MULTILINE)
        self.assertIsNotNone(desc_match, "missing description")
        description = desc_match.group(1)
        self.assertLessEqual(len(description), 1024)
        for term in ["Shoo", "@shoojs/react", "@shoojs/auth", "Convex", "server-side id_token verification"]:
            self.assertIn(term, description)

    def test_required_sections_exist(self):
        for section in [
            "## When to Use",
            "## Do Not Use / Escalate",
            "## Inputs and Assumptions",
            "## Fit Gate",
            "## Workflow",
            "## Verification",
            "## Safety and Failure Modes",
            "## Sources and Maintenance",
        ]:
            self.assertIn(section, self.text)

    def test_deterministic_security_rules_are_present(self):
        required = [
            "Never authorize from `identity.userId`, localStorage, or `decodeIdentityClaims()` alone",
            "issuer: \"https://shoo.dev\"",
            "origin:${new URL(appOrigin).origin}",
            "https://shoo.dev/.well-known/jwks.json",
            "pairwise_sub",
            "requestPii: true",
            "Do not log, paste, persist, or commit raw `id_token`s",
        ]
        for needle in required:
            self.assertIn(needle, self.text)

    def test_reference_snapshot_exists(self):
        self.assertTrue(REFERENCE.exists(), "missing docs summary reference")
        ref = REFERENCE.read_text(encoding="utf-8")
        for needle in [
            "https://docs.shoo.dev/docs",
            "@shoojs/react",
            "@shoojs/auth",
            "https://shoo.dev/.well-known/openid-configuration",
            "https://shoo.dev/.well-known/jwks.json",
        ]:
            self.assertIn(needle, ref)

    def test_no_private_home_paths_or_token_fixtures(self):
        combined = self.text + "\n" + REFERENCE.read_text(encoding="utf-8")
        self.assertIsNone(re.search(r"/(home|Users)/[A-Za-z0-9._-]+", combined))
        self.assertNotIn("eyJ", combined, "do not include JWT-looking token fixtures")


if __name__ == "__main__":
    unittest.main()
