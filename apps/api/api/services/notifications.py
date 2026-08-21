"""Operational email notifications for the app operator."""

import html
import os

from backend.emails_module.utils_sendgrid import send_email


def notify_signup(email: str, name: str) -> None:
    """Email the operator about a new signup.

    No-ops unless SIGNUP_NOTIFY_EMAIL is set. send_email reports failure via
    its return value instead of raising, so a lost notification can never
    break the registration request that triggered it.
    """
    to_address = os.getenv("SIGNUP_NOTIFY_EMAIL")
    if not to_address:
        return
    safe_name = html.escape(name or "Someone")
    safe_email = html.escape(email)
    send_email(
        to_address,
        f"<p><strong>{safe_name}</strong> just signed up with {safe_email}.</p>",
        subject=f"New FeedTLDR signup: {email}",
    )


def send_welcome_email(email: str, name: str) -> None:
    """Greet a user right after their account is created. Best-effort."""
    first_name = html.escape(name.split()[0]) if name and name.strip() else ""
    greeting = f"Hi {first_name}," if first_name else "Hi,"
    app_url = os.getenv("DOMAIN_URL", "https://www.feedtldr.com").rstrip("/")
    content = (
        f"<p>{greeting}</p>"
        "<p>Welcome to FeedTLDR — your X feed, summarized every morning.</p>"
        "<p>To get your first brief: add the accounts you want us to follow, "
        "then hit Generate. A few minutes later your summary is ready to read "
        "or listen to, and can land in your inbox every weekday morning.</p>"
        f'<p><a href="{app_url}/app">Open your feed</a></p>'
        "<p>— Pablo, FeedTLDR</p>"
    )
    send_email(email, content, subject="Welcome to FeedTLDR")
