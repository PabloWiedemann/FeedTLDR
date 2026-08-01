import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
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


def send_email(
    target_email,
    content,
    subject="FeedTLDR Notification",
    from_email="no-reply@feedtldr.com",
):
    """
    Send an email to the given email address with the given content.
    """
    message = Mail(
        from_email=from_email,
        to_emails=target_email,
        subject=subject,
        html_content=content,
    )

    try:
        load_dotenv()
        sg = SendGridAPIClient(os.environ.get("SENDGRID_API_KEY"))
        response = sg.send(message)
        logger.info(f"Email sent status code: {response.status_code}")

        # Check if the status code is 202 (Accepted)
        if int(response.status_code) == 202:
            return True
        else:
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
        from_email="no-reply@feedtldr.com",
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
        from_email="no-reply@feedtldr.com",
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
        from_email="no-reply@feedtldr.com",
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
        from_email="no-reply@feedtldr.com",
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
        from_email="no-reply@feedtldr.com",
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
        subject="Your FeedTLDR Free Trial Has Ended",
        from_email="no-reply@feedtldr.com",
    )
    return success


def test_send_summary_email():
    # Read the summary HTML file
    summary_path = "/Users/pablowiedemann/Documents/xDev/MyFeedTLDR/feedtldr_streamlit/backend/data/pablo@test.com/outputs/summary.html"
    audio_url = "https://storage.googleapis.com/feedtldr.firebasestorage.app/users/pablo%40test.com_v932xfN0RxMjRKd2VzRVOgMToXI2/latest/summary.mp3"
    try:
        with open(summary_path, "r") as file:
            summary_html = file.read()

        # Send the email
        test_email = "wablomann@gmail.com"
        send_feed_summary_email(test_email, summary_html, audio_url=audio_url)
        print("✅ Test email sent successfully")

    except FileNotFoundError:
        print("❌ Summary HTML file not found")
    except Exception as e:
        print(f"❌ Error sending test email: {str(e)}")
