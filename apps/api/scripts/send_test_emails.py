"""One-off: send every email template to a test inbox for visual review.

Usage: uv run python scripts/send_test_emails.py <target_email>
"""

import os
import sys

import requests
from dotenv import load_dotenv

from backend.emails_module.email_template import (
    create_email_template,
    get_delete_account_content,
    get_email_footer,
    get_free_plan_end_notification_content,
    get_generation_success_content,
    get_header_with_logo_and_audio,
    get_newsletter_subscription_success_content,
    get_unsubscribe_confirmation_content,
)

RESEND_API_URL = "https://api.resend.com/emails"
DEFAULT_FROM = "FeedTLDR <no-reply@mail.feedtldr.com>"

# Mirrors the pipeline's real output shape (title, <br><hr><br> dividers,
# numbered items, "Relevant URLs" link lists) so the summary email preview
# is faithful.
SAMPLE_SUMMARY = """
<h2>Creative AI Frontiers: Video Models and Agent Workflows</h2>

<br><hr style="border: 0; border-top: 1px solid #cccccc;"><br>

<h3>Breakthroughs and New Model Releases</h3>
<p>1. <b>Seedance 2.5 launches in 1080p:</b> Pika Labs, ComfyUI, and fal
announced availability of Seedance 2.5 in full 1080p, with enhanced textural
detail and end-to-end 3D-to-video pipelines at lower cost.</p>
<p>Relevant URLs:</p>
<ul style="padding-left: 40px;">
  <li><a href="https://x.com/pika_labs/status/1">Pika Labs announces Seedance 2.5 in 1080p</a></li>
  <li><a href="https://x.com/ComfyUI/status/2">ComfyUI live announcement for Seedance 2.5</a></li>
</ul>
<br>

<p>2. <b>Stable Audio 3.0 DAW plugin:</b> Stability AI introduced a native
DAW plugin and a redesigned browser studio with commercial-safe rights
protection.</p>
<p>Relevant URLs:</p>
<ul style="padding-left: 40px;">
  <li><a href="https://x.com/StabilityAI/status/3">Stability AI release announcement</a></li>
</ul>
"""

EMAILS = [
    ("[Test] Your Feed Summary", get_generation_success_content(), None),
    (
        "[Test] Welcome to FeedTLDR's Daily Newsletter",
        get_newsletter_subscription_success_content(),
        None,
    ),
    (
        "[Test] Unsubscribed from FeedTLDR's Daily Newsletter",
        get_unsubscribe_confirmation_content(),
        None,
    ),
    ("[Test] Your FeedTLDR Account Has Been Deleted", get_delete_account_content(), None),
    (
        "[Test] Your free FeedTLDR summaries are paused",
        get_free_plan_end_notification_content(),
        None,
    ),
    (
        "[Test] Your Feed Summary (newsletter)",
        SAMPLE_SUMMARY,
        get_header_with_logo_and_audio("https://feedtldr.com/app"),
    ),
]


def main() -> int:
    target = sys.argv[1]
    load_dotenv()
    api_key = os.environ["RESEND_API_KEY"]

    failures = 0
    for subject, content, header in EMAILS:
        html = create_email_template(
            email_content=content, email_footer=get_email_footer(), email_header=header
        )
        response = requests.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={"from": DEFAULT_FROM, "to": [target], "subject": subject, "html": html},
            timeout=30,
        )
        print(f"{response.status_code} {subject}")
        if response.status_code != 200:
            failures += 1
            print(f"  {response.text[:200]}")
    return failures


if __name__ == "__main__":
    raise SystemExit(main())
