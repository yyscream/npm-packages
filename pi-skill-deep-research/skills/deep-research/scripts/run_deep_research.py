#!/usr/bin/env python3
"""Deterministic deep-research runner.

Executes a strict collect -> normalize -> classify -> render -> validate
pipeline. Every decision is traced in the output so identical input + state
produces identical output.

Exit codes:
  0  Success
  1  Validation / policy error (bad input, schema mismatch)
  2  Upstream retrieval partial (some sources unreachable)
  3  No-evidence fallback produced (no sources found at all)
"""

import argparse
import hashlib
import json
import re
import string
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, urlunparse

SCHEMA_VERSION = "1.0.0"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_text(text: str) -> str:
    """Lowercase, strip punctuation and collapse whitespace."""
    text = text.lower()
    text = text.translate(str.maketrans("", "", string.punctuation))
    return " ".join(text.split())


def topic_hash(topic_normalized: str) -> str:
    return hashlib.sha256(topic_normalized.encode()).hexdigest()[:8]


def make_run_id(ts: datetime, topic_normalized: str) -> str:
    stamp = ts.strftime("%Y%m%dT%H%M%SZ")
    return f"dr-{stamp}-{topic_hash(topic_normalized)}"


def normalize_url(url: str) -> str:
    """Strip query params, fragments, and tracking junk."""
    parsed = urlparse(url)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))


def dedupe_key(title: str, url: str, year: int | None) -> str:
    title_norm = normalize_text(title)
    host = urlparse(url).netloc if url else ""
    return f"{title_norm}|{host}|{year or 'unknown'}"


def load_json(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)


def save_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


# ---------------------------------------------------------------------------
# Stage 1: Collect — read or build structured claims
# ---------------------------------------------------------------------------

def collect_claims(topic: str, claims_file: Path | None, policy: dict) -> tuple[list[dict], list[dict]]:
    """Return (claims, failures). Each claim has claim_text, evidence_required,
    confidence_target, and an assigned claim_id."""
    max_claims = policy["claims"]["max_per_run"]
    default_ct = policy["claims"]["default_confidence_target"]
    failures: list[dict] = []

    if claims_file and claims_file.exists():
        raw = load_json(claims_file)
        if not isinstance(raw, list) or len(raw) == 0:
            failures.append({
                "failure_type": "claim_extraction_failure",
                "message": policy["fallbacks"]["claim_extraction_failure"]["message"],
                "fallback_action": policy["fallbacks"]["claim_extraction_failure"]["action"],
                "timestamp": now_iso(),
            })
            return [], failures
        claims = raw[:max_claims]
    else:
        # When no claims file supplied, the LLM caller is expected to provide
        # the claims via --claims-json stdin or pre-populate a file.  In the
        # deterministic runner we require explicit claims.
        failures.append({
            "failure_type": "claim_extraction_failure",
            "message": policy["fallbacks"]["claim_extraction_failure"]["message"],
            "fallback_action": policy["fallbacks"]["claim_extraction_failure"]["action"],
            "timestamp": now_iso(),
        })
        return [], failures

    result = []
    for idx, c in enumerate(claims):
        claim = {
            "claim_id": f"C{idx + 1:03d}",
            "claim_text": c.get("claim_text", c.get("text", "")),
            "evidence_required": c.get("evidence_required", ""),
            "confidence_target": c.get("confidence_target", default_ct),
        }
        if not claim["claim_text"]:
            failures.append({
                "failure_type": "claim_extraction_failure",
                "claim_id": claim["claim_id"],
                "message": f"Claim at index {idx} has no claim_text",
                "fallback_action": "skip_claim",
                "timestamp": now_iso(),
            })
            continue
        result.append(claim)

    return result, failures


# ---------------------------------------------------------------------------
# Stage 2: Normalize — canonicalize claims and dedupe
# ---------------------------------------------------------------------------

def normalize_claims(claims: list[dict], state: dict) -> list[dict]:
    """Enrich claims with canonical IDs and update canonicalization map."""
    canon_map = state.get("claim_canonicalization", {})
    for claim in claims:
        raw = claim["claim_text"]
        norm = normalize_text(raw)
        if norm not in canon_map:
            canon_map[norm] = claim["claim_id"]
        claim["_normalized"] = norm
    state["claim_canonicalization"] = canon_map
    return claims


# ---------------------------------------------------------------------------
# Stage 3: Collect evidence (stub — actual retrieval is done by the LLM caller)
# ---------------------------------------------------------------------------

def attach_evidence(claims: list[dict], evidence_file: Path | None, policy: dict) -> tuple[list[dict], list[dict]]:
    """Attach evidence from a pre-collected JSON file to claims.
    The evidence file is a list of objects with claim_id and sources[].

    Returns (enriched_claims, failures).
    """
    failures: list[dict] = []
    budget = policy["evidence_budget"]
    max_per_claim = budget["max_sources_per_claim"]

    if not evidence_file or not evidence_file.exists():
        for claim in claims:
            claim["evidence"] = []
            failures.append({
                "failure_type": "no_sources_at_all",
                "claim_id": claim["claim_id"],
                "message": policy["fallbacks"]["no_sources_at_all"]["message"],
                "fallback_action": policy["fallbacks"]["no_sources_at_all"]["action"],
                "timestamp": now_iso(),
            })
        return claims, failures

    raw_evidence = load_json(evidence_file)
    evidence_by_claim: dict[str, list[dict]] = {}
    for entry in raw_evidence:
        cid = entry.get("claim_id", "")
        evidence_by_claim.setdefault(cid, []).extend(entry.get("sources", []))

    seen_dedupe_keys: set[str] = set()
    global_source_counter = 0

    for claim in claims:
        cid = claim["claim_id"]
        raw_sources = evidence_by_claim.get(cid, [])

        if not raw_sources:
            claim["evidence"] = []
            failures.append({
                "failure_type": "no_sources_at_all",
                "claim_id": cid,
                "message": policy["fallbacks"]["no_sources_at_all"]["message"],
                "fallback_action": policy["fallbacks"]["no_sources_at_all"]["action"],
                "timestamp": now_iso(),
            })
            continue

        normed_sources = []
        for src in raw_sources:
            url = normalize_url(src.get("url", src.get("canonical_url", "")))
            title = src.get("title", "")
            year = src.get("year")
            dk = dedupe_key(title, url, year)

            if dk in seen_dedupe_keys:
                continue
            seen_dedupe_keys.add(dk)

            global_source_counter += 1
            normed_sources.append({
                "source_id": f"S{global_source_counter:03d}",
                "tier": src.get("tier", "community"),
                "citation": src.get("citation", ""),
                "title": title,
                "authors": src.get("authors", ""),
                "year": year,
                "canonical_url": url,
                "retrieved_at": src.get("retrieved_at", now_iso()),
                "supports_claim": src.get("supports_claim", True),
                "relevance_note": src.get("relevance_note", ""),
                "dedupe_key": dk,
            })

        tier_order = {t: i for i, t in enumerate(policy["source_tiers"]["order"])}
        normed_sources.sort(key=lambda s: (
            tier_order.get(s["tier"], 99),
            -(s.get("year") or 0),
            s["canonical_url"],
        ))

        claim["evidence"] = normed_sources[:max_per_claim]

        pr_count = sum(1 for s in claim["evidence"] if s["tier"] == "peer_reviewed")
        if pr_count == 0 and claim["evidence"]:
            failures.append({
                "failure_type": "no_peer_reviewed",
                "claim_id": cid,
                "message": policy["fallbacks"]["no_peer_reviewed"]["message"],
                "fallback_action": policy["fallbacks"]["no_peer_reviewed"]["action"],
                "timestamp": now_iso(),
            })

    return claims, failures


# ---------------------------------------------------------------------------
# Stage 4: Classify — apply verdict rules per claim
# ---------------------------------------------------------------------------

def classify_verdicts(claims: list[dict], policy: dict) -> tuple[list[dict], list[dict]]:
    """Apply deterministic verdict classification per claim.
    Returns (claims_with_verdicts, decision_trace).
    """
    thresholds = policy["verdicts"]["thresholds"]
    fallbacks = policy["fallbacks"]
    trace: list[dict] = []

    for claim in claims:
        evidence = claim.get("evidence", [])
        pr_count = sum(1 for s in evidence if s["tier"] == "peer_reviewed")
        total = len(evidence)
        supporting = sum(1 for s in evidence if s.get("supports_claim", True))
        agreement_ratio = supporting / total if total > 0 else 0.0
        contradicting = total - supporting

        claim["peer_reviewed_count"] = pr_count
        claim["agreement_ratio"] = round(agreement_ratio, 2)

        if total == 0:
            verdict = "insufficient_evidence"
            rule_id = "verdict.insufficient_evidence"
            reason = f"No evidence found (0 sources)"
        elif contradicting >= thresholds["contradicted"]["min_contradicting"] and agreement_ratio < thresholds["contradicted"]["min_agreement_ratio_below"]:
            verdict = "contradicted"
            rule_id = "verdict.contradicted"
            reason = f"{contradicting} contradicting source(s), agreement_ratio={agreement_ratio:.2f} < {thresholds['contradicted']['min_agreement_ratio_below']}"
        elif pr_count >= thresholds["supported"]["min_peer_reviewed"] and agreement_ratio >= thresholds["supported"]["min_agreement_ratio"]:
            verdict = "supported"
            rule_id = "verdict.supported"
            reason = f"{pr_count} peer-reviewed, agreement_ratio={agreement_ratio:.2f} >= {thresholds['supported']['min_agreement_ratio']}"
        elif pr_count >= thresholds["partially_supported"]["min_peer_reviewed"] and agreement_ratio >= thresholds["partially_supported"]["min_agreement_ratio"]:
            verdict = "partially_supported"
            rule_id = "verdict.partially_supported"
            reason = f"{pr_count} peer-reviewed, agreement_ratio={agreement_ratio:.2f} >= {thresholds['partially_supported']['min_agreement_ratio']}"
        else:
            no_pr_cap = fallbacks.get("no_peer_reviewed", {}).get("verdict_cap")
            if pr_count == 0 and no_pr_cap:
                verdict = no_pr_cap
                rule_id = "fallback.no_peer_reviewed"
                reason = f"0 peer-reviewed sources; verdict capped at {no_pr_cap}"
            else:
                verdict = "insufficient_evidence"
                rule_id = "verdict.insufficient_evidence"
                reason = f"{pr_count} peer-reviewed, agreement_ratio={agreement_ratio:.2f}, does not meet any threshold"

        claim["verdict"] = verdict
        claim["verdict_reason"] = reason

        trace.append({
            "rule_id": rule_id,
            "claim_id": claim["claim_id"],
            "inputs": {
                "peer_reviewed_count": pr_count,
                "total_sources": total,
                "supporting": supporting,
                "contradicting": contradicting,
                "agreement_ratio": round(agreement_ratio, 2),
            },
            "result": verdict,
            "timestamp": now_iso(),
        })

    return claims, trace


# ---------------------------------------------------------------------------
# Stage 5: Render — build deterministic output structure
# ---------------------------------------------------------------------------

def render_output(
    topic: str,
    topic_normalized: str,
    run_id: str,
    policy_version: str,
    topic_summary: str,
    claims: list[dict],
    decision_trace: list[dict],
    failures: list[dict],
    ts: datetime,
) -> dict:
    """Build the final output dict in fixed section order."""
    verdict_counts = {v: 0 for v in ["supported", "partially_supported", "insufficient_evidence", "contradicted"]}
    for c in claims:
        v = c.get("verdict", "insufficient_evidence")
        if v in verdict_counts:
            verdict_counts[v] += 1

    clean_claims = []
    for c in claims:
        clean_claims.append({
            "claim_id": c["claim_id"],
            "claim_text": c["claim_text"],
            "evidence_required": c.get("evidence_required", ""),
            "confidence_target": c["confidence_target"],
            "verdict": c["verdict"],
            "verdict_reason": c.get("verdict_reason", ""),
            "evidence": c.get("evidence", []),
            "agreement_ratio": c.get("agreement_ratio", 0.0),
            "peer_reviewed_count": c.get("peer_reviewed_count", 0),
        })

    return {
        "topic": topic,
        "topic_normalized": topic_normalized,
        "run_id": run_id,
        "policy_version": policy_version,
        "schema_version": SCHEMA_VERSION,
        "timestamp": ts.isoformat(),
        "topic_summary": topic_summary,
        "claims": clean_claims,
        "verdict_summary": {
            "total_claims": len(clean_claims),
            **verdict_counts,
        },
        "decision_trace": decision_trace,
        "failures": failures,
    }


def render_markdown(output: dict, policy: dict) -> str:
    """Render structured output as human-readable markdown."""
    flags = policy["source_tiers"]["flags"]
    labels = policy["source_tiers"]["labels"]

    lines: list[str] = []
    lines.append(f"# Deep Research: {output['topic']}")
    lines.append("")
    lines.append(f"**Run ID:** `{output['run_id']}`  ")
    lines.append(f"**Policy:** v{output['policy_version']}  ")
    lines.append(f"**Timestamp:** {output['timestamp']}")
    lines.append("")

    lines.append("## Topic Summary")
    lines.append("")
    lines.append(output.get("topic_summary", "_No summary provided._"))
    lines.append("")

    lines.append("## Claims & Evidence")
    lines.append("")

    for claim in output["claims"]:
        verdict_display = claim["verdict"].replace("_", " ").title()
        lines.append(f"### {claim['claim_id']}: {claim['claim_text']}")
        lines.append("")
        lines.append(f"**Verdict:** {verdict_display}  ")
        lines.append(f"**Reason:** {claim.get('verdict_reason', 'N/A')}  ")
        lines.append(f"**Peer-reviewed sources:** {claim.get('peer_reviewed_count', 0)} | "
                      f"**Agreement ratio:** {claim.get('agreement_ratio', 0.0):.0%}")
        lines.append("")

        if claim["evidence"]:
            for src in claim["evidence"]:
                tier = src["tier"]
                flag = flags.get(tier, "")
                label = labels.get(tier, tier)
                lines.append(f"- {flag} **{label}:** {src.get('title', 'Untitled')}")
                if src.get("citation"):
                    lines.append(f"  {src['citation']}")
                if src.get("canonical_url"):
                    lines.append(f"  {src['canonical_url']}")
                stance = "supports" if src.get("supports_claim") else "contradicts"
                lines.append(f"  _({stance} claim)_")
            lines.append("")
        else:
            lines.append("_No evidence found._")
            lines.append("")

    lines.append("## Verdict Summary")
    lines.append("")
    vs = output["verdict_summary"]
    lines.append(f"| Verdict | Count |")
    lines.append(f"|---|---:|")
    for v in ["supported", "partially_supported", "insufficient_evidence", "contradicted"]:
        lines.append(f"| {v.replace('_', ' ').title()} | {vs.get(v, 0)} |")
    lines.append(f"| **Total** | **{vs.get('total_claims', 0)}** |")
    lines.append("")

    if output["failures"]:
        lines.append("## Failures")
        lines.append("")
        for f in output["failures"]:
            cid = f.get("claim_id", "global")
            lines.append(f"- **[{cid}]** {f['failure_type']}: {f['message']}")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("_True facts require scientific evidence. Everything else is speculation or anecdote._")
    lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Stage 6: Validate — check output against schema constraints
# ---------------------------------------------------------------------------

def validate_output(output: dict, schema: dict) -> list[str]:
    """Lightweight schema validation without jsonschema dependency.
    Checks required fields, types, enum values, and pattern constraints.
    Returns list of error strings (empty = valid).
    """
    errors: list[str] = []

    for field in schema.get("required", []):
        if field not in output:
            errors.append(f"Missing required top-level field: {field}")

    if "run_id" in output:
        pattern = r"^dr-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{8}$"
        if not re.match(pattern, output["run_id"]):
            errors.append(f"run_id does not match pattern: {output['run_id']}")

    valid_verdicts = {"supported", "partially_supported", "insufficient_evidence", "contradicted"}

    claims = output.get("claims", [])
    if not isinstance(claims, list):
        errors.append("claims must be an array")
    else:
        if len(claims) > 5:
            errors.append(f"claims exceeds maxItems 5: got {len(claims)}")
        for i, c in enumerate(claims):
            for rf in ["claim_id", "claim_text", "confidence_target", "verdict", "evidence"]:
                if rf not in c:
                    errors.append(f"claims[{i}] missing required field: {rf}")
            if c.get("verdict") and c["verdict"] not in valid_verdicts:
                errors.append(f"claims[{i}].verdict invalid: {c['verdict']}")
            for j, src in enumerate(c.get("evidence", [])):
                for sf in ["source_id", "tier", "citation", "canonical_url", "retrieved_at", "supports_claim"]:
                    if sf not in src:
                        errors.append(f"claims[{i}].evidence[{j}] missing: {sf}")

    vs = output.get("verdict_summary")
    if vs:
        for vf in ["total_claims", "supported", "partially_supported", "insufficient_evidence", "contradicted"]:
            if vf not in vs:
                errors.append(f"verdict_summary missing: {vf}")

    return errors


# ---------------------------------------------------------------------------
# State management
# ---------------------------------------------------------------------------

def update_state(state: dict, output: dict, policy: dict) -> dict:
    """Update state.json with run metadata and dedupe info."""
    state["metadata"]["policy_version"] = policy["policy_version"]
    state["metadata"]["schema_version"] = SCHEMA_VERSION
    state["metadata"]["updated_at"] = now_iso()
    if state["metadata"]["created_at"] is None:
        state["metadata"]["created_at"] = now_iso()

    run_entry = {
        "run_id": output["run_id"],
        "topic_normalized": output.get("topic_normalized", ""),
        "topic_hash": topic_hash(output.get("topic_normalized", "")),
        "claims_count": len(output.get("claims", [])),
        "verdicts": {c["claim_id"]: c["verdict"] for c in output.get("claims", [])},
        "timestamp": output.get("timestamp", now_iso()),
    }

    state["last_run"] = run_entry
    state.setdefault("runs", []).append(run_entry)

    existing_fingerprints = set(state.get("source_dedupe_fingerprints", []))
    for claim in output.get("claims", []):
        for src in claim.get("evidence", []):
            dk = src.get("dedupe_key", "")
            if dk:
                existing_fingerprints.add(dk)
    state["source_dedupe_fingerprints"] = sorted(existing_fingerprints)

    return state


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Deterministic deep-research runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--topic", required=True, help="Research topic")
    parser.add_argument("--topic-summary", default="", help="Phase 1 general research summary")
    parser.add_argument("--claims-file", type=Path, help="JSON file with structured claims")
    parser.add_argument("--evidence-file", type=Path, help="JSON file with pre-collected evidence per claim")
    parser.add_argument("--policy", type=Path, required=True, help="Path to policy.json")
    parser.add_argument("--schema", type=Path, help="Path to output-schema.json")
    parser.add_argument("--state", type=Path, required=True, help="Path to state.json")
    parser.add_argument("--output-json", type=Path, help="Path to write JSON output")
    parser.add_argument("--output-md", type=Path, help="Path to write Markdown output")

    args = parser.parse_args()

    policy = load_json(args.policy)
    state = load_json(args.state)

    ts = datetime.now(timezone.utc)
    tn = normalize_text(args.topic)
    run_id = make_run_id(ts, tn)

    all_failures: list[dict] = []

    # Stage 1: Collect
    claims, collect_failures = collect_claims(args.topic, args.claims_file, policy)
    all_failures.extend(collect_failures)

    if not claims:
        output = render_output(
            topic=args.topic,
            topic_normalized=tn,
            run_id=run_id,
            policy_version=policy["policy_version"],
            topic_summary=args.topic_summary,
            claims=[],
            decision_trace=[],
            failures=all_failures,
            ts=ts,
        )
        if args.output_json:
            save_json(args.output_json, output)
        print(json.dumps(output, indent=2, ensure_ascii=False))
        sys.exit(1)

    # Stage 2: Normalize
    claims = normalize_claims(claims, state)

    # Stage 3: Attach evidence
    claims, evidence_failures = attach_evidence(claims, args.evidence_file, policy)
    all_failures.extend(evidence_failures)

    # Stage 4: Classify
    claims, decision_trace = classify_verdicts(claims, policy)

    # Stage 5: Render
    output = render_output(
        topic=args.topic,
        topic_normalized=tn,
        run_id=run_id,
        policy_version=policy["policy_version"],
        topic_summary=args.topic_summary,
        claims=claims,
        decision_trace=decision_trace,
        failures=all_failures,
        ts=ts,
    )

    # Stage 6: Validate
    if args.schema and args.schema.exists():
        schema = load_json(args.schema)
    else:
        schema = {"required": ["topic", "run_id", "policy_version", "claims", "verdict_summary", "decision_trace", "failures"]}

    validation_errors = validate_output(output, schema)
    if validation_errors:
        all_failures.append({
            "failure_type": "schema_validation_failure",
            "message": f"{len(validation_errors)} validation error(s): {'; '.join(validation_errors[:5])}",
            "fallback_action": "reject_output",
            "timestamp": now_iso(),
        })
        output["failures"] = all_failures
        if args.output_json:
            save_json(args.output_json, output)
        print(json.dumps({"valid": False, "errors": validation_errors}, indent=2), file=sys.stderr)
        print(json.dumps(output, indent=2, ensure_ascii=False))
        sys.exit(1)

    # Write outputs
    if args.output_json:
        save_json(args.output_json, output)

    if args.output_md:
        md = render_markdown(output, policy)
        args.output_md.parent.mkdir(parents=True, exist_ok=True)
        args.output_md.write_text(md)

    # Update state
    state = update_state(state, output, policy)
    save_json(args.state, state)

    print(json.dumps(output, indent=2, ensure_ascii=False))

    all_no_evidence = all(len(c.get("evidence", [])) == 0 for c in output["claims"])
    has_retrieval_failure = any(f["failure_type"] == "retrieval_failure" for f in all_failures)

    if all_no_evidence:
        sys.exit(3)
    elif has_retrieval_failure:
        sys.exit(2)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
