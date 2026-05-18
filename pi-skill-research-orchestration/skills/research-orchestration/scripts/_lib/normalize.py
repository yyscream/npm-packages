from __future__ import annotations

import hashlib
import re
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse


def normalize_url(url: str, tracking_query_params: list[str] | None = None) -> str:
    """Normalize URL for dedupe while preserving non-tracking query params."""
    raw = str(url or "").strip()
    if not raw:
        return ""

    parsed = urlparse(raw)
    scheme = parsed.scheme.lower() or "https"
    netloc = parsed.netloc.lower()
    path = re.sub(r"/{2,}", "/", parsed.path or "/")
    if path != "/":
        path = path.rstrip("/")

    blocked = {p.lower() for p in (tracking_query_params or [])}
    query_items = [
        (k, v)
        for k, v in parse_qsl(parsed.query, keep_blank_values=True)
        if k.lower() not in blocked
    ]
    query = urlencode(sorted(query_items), doseq=True)
    return urlunparse((scheme, netloc, path, "", query, ""))


def normalize_url_strip_all_query(url: str) -> str:
    """Normalize URL and drop all query parameters."""
    normalized = normalize_url(url, [])
    parsed = urlparse(normalized)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))


def _title_key(title: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s-]", "", str(title or "").lower())).strip()


def dedupe_key(title: str, url: str, year: int | None = None) -> str:
    """Stable source dedupe key from normalized title/url/year."""
    material = "|".join([_title_key(title), normalize_url(url, []), str(year or "")])
    return hashlib.sha256(material.encode("utf-8")).hexdigest()[:16]


def content_fingerprint(text: str) -> str:
    """Stable hash for fetched content/excerpts."""
    normalized = re.sub(r"\s+", " ", str(text or "")).strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()
