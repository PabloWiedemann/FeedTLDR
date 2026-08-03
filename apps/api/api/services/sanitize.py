"""HTML sanitization for LLM-generated content."""

import nh3


def sanitize_summary_html(html: str | None) -> str:
    """LLM-generated HTML goes through an allowlist sanitizer before it ever
    reaches a browser (the legacy app rendered it raw via st.html)."""
    if not html:
        return ""
    return nh3.clean(html)
