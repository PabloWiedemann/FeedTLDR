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
