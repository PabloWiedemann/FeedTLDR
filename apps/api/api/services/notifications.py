"""Operational email notifications for the app operator."""

import html
import os

from backend.emails_module.email_template import (
    BUTTON_STYLE,
    FOREST,
    INK,
    MUTED,
    create_email_template,
    get_email_footer,
    get_header_with_logo_and_audio,
)
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
    """Greet a user right after their account is created. Best-effort.

    Rendered with the same template pieces as the other transactional
    emails (backend/emails_module/email_template.py).
    """
    first_name = html.escape(name.split()[0]) if name and name.strip() else ""
    greeting = f"Hi {first_name}," if first_name else "Hi,"
    app_url = os.getenv("DOMAIN_URL", "https://www.feedtldr.com").rstrip("/")
    welcome = f"""
    <div style="text-align: center; padding: 24px 0;">
        <h2 style="color: {INK}; font-size: 22px; line-height: 1.3; margin: 0 0 12px;">Welcome to FeedTLDR</h2>
        <p style="line-height: 1.6; margin: 0 0 8px;">{greeting} so glad you're here.</p>
        <p style="line-height: 1.6; margin: 0 0 20px;">Mornings just got simpler: pick the X accounts you care about, and we turn everything they post into one calm daily brief — ready to read with your coffee or listen to on the go.</p>
        <a href="{app_url}/app" style="{BUTTON_STYLE}">Get your first brief</a>
        <p style="margin: 24px 0 0; font-size: 14px; color: {MUTED};">Questions? Write us anytime at <a href="mailto:info@toriml.com" style="color: {FOREST};">info@toriml.com</a> — a human reads every note.</p>
    </div>
    """
    content = create_email_template(
        welcome, get_email_footer(), get_header_with_logo_and_audio()
    )
    send_email(email, content, subject="Welcome to FeedTLDR")
