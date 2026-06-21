"""Normalize segment titles to a consistent short Title-Case label.

Segment names arrive from three places with wildly different conventions:
CSV cells (whatever the analyst typed), AI suggestions (sometimes full
sentences), and manual creation. This util converges them on one house style:
a concise Title-Case phrase, small connector words lower-cased, known acronyms
upper-cased, and a soft word cap so descriptive run-ons get trimmed.

Deterministic on purpose — no LLM — so the same input always yields the same
label (the AI paths are *prompted* for short labels; this is the safety net).
"""

from __future__ import annotations

import re

# connector words kept lower-case unless they lead the title
_SMALL = {
    "a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or",
    "the", "to", "vs", "with", "per",
}

# tokens that should stay fully upper-cased when they appear
_ACRONYMS = {
    "ai", "ml", "llm", "nlp", "cv", "api", "b2b", "b2c", "crm", "erp", "hr",
    "ui", "ux", "iot", "ar", "vr", "kyc", "aml", "ocr", "rpa", "esg", "ev",
    "evs", "us", "uk", "eu", "gpu", "cpu", "sdk",
}

# tokens with a canonical mixed-case spelling
_MIXED = {"saas": "SaaS", "paas": "PaaS", "iaas": "IaaS", "devops": "DevOps", "fintech": "Fintech"}

MAX_WORDS = 6


def _cap_word(word: str, *, first: bool) -> str:
    low = word.lower()
    if low in _MIXED:
        return _MIXED[low]
    if low in _ACRONYMS:
        return low.upper()
    if not first and low in _SMALL:
        return low
    # preserve internal capitals for things already mixed-case (e.g. "iOS")
    if any(c.isupper() for c in word[1:]):
        return word
    return word[:1].upper() + word[1:].lower()


def normalize_segment_title(raw: str | None) -> str:
    """Return a clean, short Title-Case segment label.

    Examples:
        "Horizontal support platform"  -> "Horizontal Support Platform"
        "Customer support / contact-center AI agents for regulated finance"
                                       -> "Customer Support"
        "  multimodal computer vision  data intelligence "
                                       -> "Multimodal Computer Vision Data Intelligence"
    """
    if not raw:
        return raw or ""

    text = str(raw)
    # drop parenthetical asides (often run-on qualifiers) before anything else
    text = re.sub(r"\s*\([^)]*\)?", " ", text)
    text = re.sub(r"\s+", " ", text.strip())
    if not text:
        return str(raw).strip()

    # a "X / Y" cell describes one segment two ways — keep the primary phrase
    if "/" in text:
        head = text.split("/", 1)[0].strip()
        if head:
            text = head

    # drop wrapping/trailing punctuation noise
    text = text.strip(" -–—·,;:")

    words = [w for w in text.split(" ") if w]
    if not words:
        return ""

    capped = [_cap_word(w, first=(i == 0)) for i, w in enumerate(words[:MAX_WORDS])]

    # don't let the title end on a dangling connector after truncation
    while len(capped) > 1 and capped[-1].lower() in _SMALL:
        capped.pop()

    return " ".join(capped)
