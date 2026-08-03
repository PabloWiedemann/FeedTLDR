"""Email sending. Transport migrated from SendGrid to Resend (2026-08-01, a
sanctioned exception to the backend freeze: the SendGrid trial expired and
newsletters were failing). Function names, signatures, and the email templates
are unchanged; only send_email's transport and the sender address moved.
Sender domain: mail.feedtldr.com (verified in Resend)."""

import os
import requests
from dotenv import load_dotenv
import traceback
from utils import get_logger
from backend.emails_module.email_template import (
    get_header_with_logo_and_audio,
    create_email_template,
    get_generation_success_content,
    get_newsletter_subscription_success_content,
    get_unsubscribe_confirmation_content,
    get_email_footer,
    get_delete_account_content,
    get_free_plan_end_notification_content,
)

logger = get_logger("main_logger")

RESEND_API_URL = "https://api.resend.com/emails"
DEFAULT_FROM = "FeedTLDR <no-reply@mail.feedtldr.com>"


def send_email(
    target_email,
    content,
    subject="FeedTLDR Notification",
    from_email=DEFAULT_FROM,
):
    """
    Send an email to the given email address with the given content.
    """
    try:
        load_dotenv()
        api_key = os.environ.get("RESEND_API_KEY")
        if not api_key:
            logger.error("Email sending failed: RESEND_API_KEY is not set")
            return False

        response = requests.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": from_email,
                "to": [target_email],
                "subject": subject,
                "html": content,
            },
            timeout=30,
        )
        logger.info(f"Email sent status code: {response.status_code}")

        if response.status_code == 200:
            return True
        else:
            logger.error(f"Email sending failed: {response.text[:300]}")
            return False

    except Exception as e:
        logger.error(f"Email sending failed: {e}")
        logger.error(traceback.format_exc())
        return False


def send_generation_success_email(target_email):
    content = create_email_template(
        email_content=get_generation_success_content(),
        email_footer=get_email_footer(),
        email_header=None,
    )
    send_email(
        target_email,
        content,
        subject="Your Feed Summary Has Been Generated",
    )


def send_newsletter_subscription_success_email(target_email):
    content = create_email_template(
        email_content=get_newsletter_subscription_success_content(),
        email_footer=get_email_footer(),
        email_header=None,
    )
    send_email(
        target_email,
        content,
        subject="Welcome to FeedTLDR's Daily Newsletter",
    )


def send_unsubscribe_confirmation_email(target_email):
    content = create_email_template(
        email_content=get_unsubscribe_confirmation_content(),
        email_footer=get_email_footer(),
        email_header=None,
    )
    send_email(
        target_email,
        content,
        subject="Unsubscribed from FeedTLDR's Daily Newsletter",
    )


def send_delete_account_email(target_email):
    content = create_email_template(
        email_content=get_delete_account_content(),
        email_footer=get_email_footer(),
        email_header=None,
    )
    send_email(
        target_email,
        content,
        subject="Your FeedTLDR Account Has Been Deleted",
    )


def send_feed_summary_email(target_email, summary, audio_url=None):
    content = create_email_template(
        email_content=summary,
        email_footer=get_email_footer(),
        email_header=get_header_with_logo_and_audio(audio_url),
    )
    success = send_email(
        target_email,
        content,
        subject="Your Feed Summary",
    )
    return success


def send_free_plan_end_notification(target_email):
    content = create_email_template(
        email_content=get_free_plan_end_notification_content(),
        email_footer=get_email_footer(),
        email_header=None,
    )
    success = send_email(
        target_email,
        content,
        subject="Your free FeedTLDR summaries are paused",
    )
    return success
