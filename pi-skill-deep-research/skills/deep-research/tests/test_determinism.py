#!/usr/bin/env python3
"""Determinism tests for deep-research runner.

Proves:
  1. Identical input + state -> identical output (reproducibility)
  2. No peer-reviewed sources -> correct fallback branch and verdict cap
  3. No evidence at all -> insufficient_evidence verdict
  4. Tie-breaking is deterministic under equal tier + year
  5. Schema validation rejects malformed output
  6. State file is updated correctly after a run
"""

import copy
import json
import subprocess
import sys
import tempfile
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = SKILL_DIR / "scripts"
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"
RUNNER = SCRIPTS_DIR / "run_deep_research.py"
POLICY = SKILL_DIR / "policy.json"
SCHEMA = SKILL_DIR / "output-schema.json"

FRESH_STATE = {
    "last_run": None,
    "runs": [],
    "claim_canonicalization": {},
    "source_dedupe_fingerprints": [],
    "metadata": {
        "policy_version": "1.0.0",
        "schema_version": "1.0.0",
        "created_at": None,
        "updated_at": None,
    },
}


def _run(topic, claims_file, evidence_file=None, topic_summary="", state_data=None):
    """Run the deterministic runner and return (exit_code, stdout_json, state)."""
    with tempfile.TemporaryDirectory() as tmp:
        state_path = Path(tmp) / "state.json"
        out_json = Path(tmp) / "output.json"
        out_md = Path(tmp) / "output.md"

        state = state_data or copy.deepcopy(FRESH_STATE)
        with open(state_path, "w") as f:
            json.dump(state, f)

        cmd = [
            sys.executable, str(RUNNER),
            "--topic", topic,
            "--topic-summary", topic_summary,
            "--claims-file", str(claims_file),
            "--policy", str(POLICY),
            "--schema", str(SCHEMA),
            "--state", str(state_path),
            "--output-json", str(out_json),
            "--output-md", str(out_md),
        ]
        if evidence_file:
            cmd.extend(["--evidence-file", str(evidence_file)])

        result = subprocess.run(cmd, capture_output=True, text=True)

        output = None
        if out_json.exists():
            with open(out_json) as f:
                output = json.load(f)

        updated_state = None
        if state_path.exists():
            with open(state_path) as f:
                updated_state = json.load(f)

        md_text = ""
        if out_md.exists():
            md_text = out_md.read_text()

        return result.returncode, output, updated_state, md_text


def _strip_timestamps(obj):
    """Recursively strip timestamp fields for comparison (they embed now())."""
    if isinstance(obj, dict):
        return {k: _strip_timestamps(v) for k, v in obj.items()
                if k not in ("timestamp", "retrieved_at", "run_id",
                             "created_at", "updated_at")}
    elif isinstance(obj, list):
        return [_strip_timestamps(v) for v in obj]
    return obj


# -------------------------------------------------------------------
# Test 1: Reproducibility — identical input -> identical output
# -------------------------------------------------------------------

def test_reproducibility():
    claims = FIXTURES_DIR / "claims_caffeine.json"
    evidence = FIXTURES_DIR / "evidence_caffeine.json"

    _, out1, _, _ = _run("Does caffeine improve focus?", claims, evidence,
                         topic_summary="Common belief about caffeine and attention.")
    _, out2, _, _ = _run("Does caffeine improve focus?", claims, evidence,
                         topic_summary="Common belief about caffeine and attention.")

    assert out1 is not None and out2 is not None, "Both runs should produce output"

    clean1 = _strip_timestamps(out1)
    clean2 = _strip_timestamps(out2)
    assert clean1 == clean2, (
        f"Outputs differ:\n{json.dumps(clean1, indent=2)}\n!=\n{json.dumps(clean2, indent=2)}"
    )
    print("PASS: test_reproducibility")


# -------------------------------------------------------------------
# Test 2: No peer-reviewed -> fallback branch + verdict cap
# -------------------------------------------------------------------

def test_no_peer_reviewed_fallback():
    claims = FIXTURES_DIR / "claims_no_evidence.json"
    evidence = FIXTURES_DIR / "evidence_community_only.json"

    exit_code, output, _, _ = _run("Crystal healing and cancer", claims, evidence)

    assert output is not None, "Should produce output"
    assert exit_code == 0, f"Expected exit 0, got {exit_code}"

    claim = output["claims"][0]
    assert claim["verdict"] in ("partially_supported", "insufficient_evidence"), \
        f"Expected capped verdict, got {claim['verdict']}"
    assert claim["peer_reviewed_count"] == 0

    has_no_pr_failure = any(
        f["failure_type"] == "no_peer_reviewed" for f in output["failures"]
    )
    assert has_no_pr_failure, "Should record no_peer_reviewed failure"
    print("PASS: test_no_peer_reviewed_fallback")


# -------------------------------------------------------------------
# Test 3: No evidence at all -> insufficient_evidence + exit 3
# -------------------------------------------------------------------

def test_no_evidence_at_all():
    claims = FIXTURES_DIR / "claims_no_evidence.json"
    evidence = FIXTURES_DIR / "evidence_empty.json"

    exit_code, output, _, _ = _run("Crystal healing", claims, evidence)

    assert output is not None, "Should produce output"
    assert exit_code == 3, f"Expected exit 3 (no-evidence fallback), got {exit_code}"

    claim = output["claims"][0]
    assert claim["verdict"] == "insufficient_evidence"
    assert claim["peer_reviewed_count"] == 0
    assert len(claim["evidence"]) == 0

    has_no_sources_failure = any(
        f["failure_type"] == "no_sources_at_all" for f in output["failures"]
    )
    assert has_no_sources_failure, "Should record no_sources_at_all failure"
    print("PASS: test_no_evidence_at_all")


# -------------------------------------------------------------------
# Test 4: Tie-break determinism (same tier + year -> URL lexical sort)
# -------------------------------------------------------------------

def test_tie_break_determinism():
    claims = FIXTURES_DIR / "claims_caffeine.json"
    evidence = FIXTURES_DIR / "evidence_tie_break.json"

    _, out1, _, _ = _run("Caffeine tie-break test", claims, evidence)
    _, out2, _, _ = _run("Caffeine tie-break test", claims, evidence)

    assert out1 is not None and out2 is not None

    sources1 = out1["claims"][0]["evidence"]
    sources2 = out2["claims"][0]["evidence"]

    urls1 = [s["canonical_url"] for s in sources1]
    urls2 = [s["canonical_url"] for s in sources2]
    assert urls1 == urls2, f"Source order differs:\n{urls1}\n!=\n{urls2}"

    # Peer-reviewed should come before community
    tiers = [s["tier"] for s in sources1]
    pr_indices = [i for i, t in enumerate(tiers) if t == "peer_reviewed"]
    community_indices = [i for i, t in enumerate(tiers) if t == "community"]
    if pr_indices and community_indices:
        assert max(pr_indices) < min(community_indices), \
            f"Peer-reviewed sources must sort before community: {tiers}"

    # Within same tier+year, URL lexical order should hold
    pr_urls = [s["canonical_url"] for s in sources1 if s["tier"] == "peer_reviewed"]
    assert pr_urls == sorted(pr_urls), f"Same-tier URLs not lexically sorted: {pr_urls}"

    print("PASS: test_tie_break_determinism")


# -------------------------------------------------------------------
# Test 5: Schema validation rejects malformed output
# -------------------------------------------------------------------

def test_schema_validation():
    """Verify the runner's validate_output catches missing fields."""
    sys.path.insert(0, str(SCRIPTS_DIR))
    from run_deep_research import validate_output, load_json

    schema = load_json(SCHEMA)

    # Minimal valid-ish output
    good_output = {
        "topic": "test",
        "run_id": "dr-20260226T100000Z-abcdef01",
        "policy_version": "1.0.0",
        "claims": [],
        "verdict_summary": {
            "total_claims": 0,
            "supported": 0,
            "partially_supported": 0,
            "insufficient_evidence": 0,
            "contradicted": 0,
        },
        "decision_trace": [],
        "failures": [],
    }
    errors = validate_output(good_output, schema)
    assert errors == [], f"Expected no errors for valid output, got: {errors}"

    # Missing required fields
    bad_output = {"topic": "test"}
    errors = validate_output(bad_output, schema)
    assert len(errors) > 0, "Should catch missing required fields"

    # Bad run_id pattern
    bad_run_id = copy.deepcopy(good_output)
    bad_run_id["run_id"] = "invalid-id"
    errors = validate_output(bad_run_id, schema)
    assert any("run_id" in e for e in errors), "Should catch bad run_id pattern"

    # Bad verdict enum
    bad_verdict = copy.deepcopy(good_output)
    bad_verdict["claims"] = [{
        "claim_id": "C001",
        "claim_text": "test",
        "confidence_target": 0.7,
        "verdict": "maybe",
        "evidence": [],
    }]
    errors = validate_output(bad_verdict, schema)
    assert any("verdict" in e for e in errors), "Should catch invalid verdict enum"

    # Missing source fields
    bad_source = copy.deepcopy(good_output)
    bad_source["claims"] = [{
        "claim_id": "C001",
        "claim_text": "test",
        "confidence_target": 0.7,
        "verdict": "supported",
        "evidence": [{"source_id": "S001"}],
    }]
    errors = validate_output(bad_source, schema)
    assert any("evidence" in e for e in errors), "Should catch missing source fields"

    print("PASS: test_schema_validation")


# -------------------------------------------------------------------
# Test 6: State file is updated after a run
# -------------------------------------------------------------------

def test_state_update():
    claims = FIXTURES_DIR / "claims_caffeine.json"
    evidence = FIXTURES_DIR / "evidence_caffeine.json"

    _, output, state, _ = _run("State update test", claims, evidence)

    assert state is not None, "State should be written"
    assert state["last_run"] is not None, "last_run should be populated"
    assert state["last_run"]["claims_count"] == 2
    assert len(state["runs"]) == 1
    assert len(state["source_dedupe_fingerprints"]) > 0
    assert state["metadata"]["policy_version"] == "1.0.0"
    assert state["metadata"]["updated_at"] is not None

    # Claim canonicalization should be populated
    assert len(state["claim_canonicalization"]) > 0

    print("PASS: test_state_update")


# -------------------------------------------------------------------
# Test 7: Verdict classification correctness
# -------------------------------------------------------------------

def test_verdict_classification():
    """Full caffeine fixture should yield 'supported' for C001 and 'contradicted' for C002."""
    claims = FIXTURES_DIR / "claims_caffeine.json"
    evidence = FIXTURES_DIR / "evidence_caffeine.json"

    _, output, _, _ = _run("Caffeine verdicts", claims, evidence)

    assert output is not None
    assert len(output["claims"]) == 2

    c001 = output["claims"][0]
    assert c001["claim_id"] == "C001"
    assert c001["verdict"] == "supported", f"C001 expected supported, got {c001['verdict']}"
    assert c001["peer_reviewed_count"] == 2

    c002 = output["claims"][1]
    assert c002["claim_id"] == "C002"
    assert c002["verdict"] == "contradicted", f"C002 expected contradicted, got {c002['verdict']}"

    # Verdict summary should match
    vs = output["verdict_summary"]
    assert vs["total_claims"] == 2
    assert vs["supported"] == 1
    assert vs["contradicted"] == 1

    # Decision trace should have entries for both claims
    assert len(output["decision_trace"]) == 2

    print("PASS: test_verdict_classification")


# -------------------------------------------------------------------
# Test 8: Markdown output is produced
# -------------------------------------------------------------------

def test_markdown_output():
    claims = FIXTURES_DIR / "claims_caffeine.json"
    evidence = FIXTURES_DIR / "evidence_caffeine.json"

    _, _, _, md = _run("Markdown test", claims, evidence)

    assert len(md) > 0, "Markdown output should not be empty"
    assert "# Deep Research:" in md
    assert "## Claims & Evidence" in md
    assert "## Verdict Summary" in md
    assert "C001" in md
    assert "C002" in md

    print("PASS: test_markdown_output")


# -------------------------------------------------------------------
# Test 9: Missing claims file -> exit code 1
# -------------------------------------------------------------------

def test_missing_claims_file():
    fake_claims = Path("/tmp/nonexistent_claims_file_dr_test.json")
    if fake_claims.exists():
        fake_claims.unlink()

    exit_code, output, _, _ = _run("No claims file", fake_claims)

    assert exit_code == 1, f"Expected exit 1 for missing claims, got {exit_code}"
    assert output is not None
    assert any(f["failure_type"] == "claim_extraction_failure" for f in output["failures"])

    print("PASS: test_missing_claims_file")


# ===================================================================

def main():
    tests = [
        test_reproducibility,
        test_no_peer_reviewed_fallback,
        test_no_evidence_at_all,
        test_tie_break_determinism,
        test_schema_validation,
        test_state_update,
        test_verdict_classification,
        test_markdown_output,
        test_missing_claims_file,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"FAIL: {test.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"ERROR: {test.__name__}: {type(e).__name__}: {e}")
            failed += 1

    print(f"\n{'='*60}")
    print(f"Results: {passed} passed, {failed} failed, {passed + failed} total")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
