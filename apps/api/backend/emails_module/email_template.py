# ============================================================
# Email Styling Components (background, outer container, etc.)
#
# Styled on the FeedTLDR design system (apps/web/app/globals.css,
# docs/DESIGN.md). Email clients need literal sRGB hex, so the
# tokens are mirrored here as constants; keep them in sync with
# the web tokens when the palette changes.
# ============================================================

BACKGROUND = "#F7F5EF"  # --background, warm bone canvas
CARD = "#FFFFFF"  # --card
INK = "#111610"  # --foreground, near-black cast toward forest
MUTED = "#656B64"  # --muted-foreground
BORDER = "#E3E7E3"  # --border
WASH = "#ECF0EC"  # --secondary, neutral wash (link pills)
MINT = "#80EBB0"  # --primary, bright mint CTA fill
MINT_BORDER = "#4E986E"  # --btn-border, darker green button outline
FOREST = "#183E27"  # --link / --accent-foreground, deep forest

FONT_STACK = "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"

# Pill CTA, mint fill with the darker green outline (Button `default`).
BUTTON_STYLE = f"""
    background-color: {MINT};
    border: 1px solid {MINT_BORDER};
    border-radius: 9999px;
    color: {INK};
    display: inline-block;
    font-weight: 600;
    padding: 12px 28px;
    text-decoration: none;
"""

# Quiet outline pill on white (Button `outline`).
OUTLINE_PILL_STYLE = f"""
    background-color: {CARD};
    border: 1px solid {BORDER};
    border-radius: 9999px;
    color: {INK};
    display: inline-block;
    font-size: 14px;
    padding: 8px 18px;
    text-decoration: none;
"""

# Summary content rules (generated summary_html: headings, paragraphs,
# and "Relevant URLs" link lists rendered as pills, like the app).
CONTENT_STYLES = f"""
    .ftldr-body {{
        font-size: 16px;
    }}
    .ftldr-body h1, .ftldr-body h2 {{
        color: {INK};
        font-size: 22px;
        line-height: 1.3;
        margin: 32px 0 12px;
    }}
    .ftldr-body h3, .ftldr-body h4 {{
        color: {INK};
        font-size: 18px;
        line-height: 1.3;
        margin: 28px 0 10px;
    }}
    .ftldr-body p {{
        font-size: 16px;
        line-height: 1.6;
        margin: 0 0 16px;
    }}
    .ftldr-body a {{
        color: {FOREST};
    }}
    .ftldr-body hr {{
        display: none;
    }}
    /* !important beats the inline padding-left the model template puts
       on its link lists */
    .ftldr-body ul {{
        list-style: none;
        margin: 8px 0 20px !important;
        padding: 0 !important;
    }}
    .ftldr-body ul li {{
        margin: 0 0 8px;
    }}
    .ftldr-body ul li a {{
        background-color: {WASH};
        border-radius: 9999px;
        color: {FOREST};
        display: inline-block;
        font-size: 14px;
        font-weight: 500;
        padding: 6px 14px;
        text-decoration: none;
    }}
"""


def email_background_component(component):
    return f"""
        <table width="100%"
               border="0"
               cellspacing="0"
               cellpadding="0"
               bgcolor="{BACKGROUND}"
               style="background-color: {BACKGROUND};
                      color: {INK};
                      font-family: {FONT_STACK};">
            <tr>
                <td style="padding: 40px 0;">
                    {component}
                </td>
            </tr>
        </table>
    """


def email_outer_container(email_content):
    return email_background_component(
        f"""
    <div class="ftldr-body" style="
        margin: 0 auto;
        max-width: 600px;
        min-width: 320px;
        width: 100%;
        background-color: {CARD};
        border-radius: 24px;
        padding: 32px 40px;
        color: {INK};
    ">
        {email_content}
    </div>
    """
    )


# ============================================================
# Email Header(s) and Footer(s)
# ============================================================
def get_email_footer():
    return f"""
    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid {BORDER}; color: {MUTED}; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0 0 8px;">This email was sent by FeedTLDR</p>
        <p style="margin: 0 0 8px;">
            <a href="https://feedtldr.com/settings" style="color: {MUTED}; text-decoration: underline;">Manage email preferences</a> |
            <a href="https://feedtldr.com/settings" style="color: {MUTED}; text-decoration: underline;">Unsubscribe</a>
        </p>
        <p style="margin: 0;">Please do not reply to this email. For support, contact us at <a href="mailto:support@feedtldr.com" style="color: {MUTED}; text-decoration: underline;">support@feedtldr.com</a>.</p>
    </div>
    """


def get_header_with_logo_and_audio(audio_url=None):
    LOGO_URL = "http://cdn.mcauto-images-production.sendgrid.net/162b8be545e2fb59/5825d57e-5d5a-48c0-a795-1d1d6c0d2956/1083x670.png"
    audio_link = (
        f"""
                <div style="margin-top: 16px;">
                    <a href="{audio_url}" style="{OUTLINE_PILL_STYLE}">🔈 Listen to the audio version</a>
                </div>
                """
        if audio_url
        else ""
    )
    return f"""
            <div style="text-align: center; margin-top: 8px; margin-bottom: 40px;">
                <a href="https://feedtldr.com">
                    <img src="{LOGO_URL}" alt="FeedTLDR" style="max-width: 88px; margin-bottom: 12px;">
                </a>
                <div>
                    <a href="https://feedtldr.com" style="color: {MUTED}; text-decoration: underline; font-size: 14px;">View online</a>
                </div>
                {audio_link}
            </div>
    """


# ============================================================
# Email Content
# ============================================================
def get_generation_success_content():
    return f"""
    <div style="text-align: center; padding: 24px 0;">
        <h2 style="color: {INK}; font-size: 22px; line-height: 1.3; margin: 0 0 12px;">Your summary is ready</h2>
        <p style="line-height: 1.6; margin: 0 0 20px;">You can now read it in the FeedTLDR app.</p>
        <a href="https://feedtldr.com/app" style="{BUTTON_STYLE}">Read your summary</a>
    </div>
    """


def get_newsletter_subscription_success_content():
    return f"""
    <div style="text-align: center; padding: 24px 0;">
        <h2 style="color: {INK}; font-size: 22px; line-height: 1.3; margin: 0 0 12px;">Welcome to FeedTLDR's daily newsletter</h2>
        <p style="line-height: 1.6; margin: 0 0 20px;">You're all set to receive daily email summaries of your feed.</p>
        <a href="https://feedtldr.com/app" style="{BUTTON_STYLE}">Open your dashboard</a>
    </div>
    """


def get_unsubscribe_confirmation_content():
    return f"""
    <div style="text-align: center; padding: 24px 0;">
        <h2 style="color: {INK}; font-size: 22px; line-height: 1.3; margin: 0 0 12px;">You are unsubscribed from the daily newsletter</h2>
        <p style="line-height: 1.6; margin: 0 0 8px;">You won't receive any more emails from us.</p>
        <p style="line-height: 1.6; margin: 0;">If this was a mistake, you can <a href="https://feedtldr.com/settings" style="color: {FOREST};">resubscribe here</a>.</p>
    </div>
    """


def get_delete_account_content():
    return f"""
    <div style="text-align: center; padding: 24px 0;">
        <h2 style="color: {INK}; font-size: 22px; line-height: 1.3; margin: 0 0 12px;">Your FeedTLDR account has been deleted</h2>
        <p style="line-height: 1.6; margin: 0 0 8px;">We're sorry to see you go. Let us know if there's anything we could have done to keep you on board.</p>
        <p style="line-height: 1.6; margin: 0;">You can <a href="mailto:support@feedtldr.com" style="color: {FOREST};">contact us here</a>.</p>
    </div>
    """


def get_free_plan_end_notification_content():
    return f"""
    <div style="text-align: center; padding: 24px 0;">
        <h2 style="color: {INK}; font-size: 22px; line-height: 1.3; margin: 0 0 12px;">Your free daily summaries are paused</h2>
        <p style="line-height: 1.6; margin: 0 0 8px;">You no longer have enough trial credits for another daily summary and newsletter.</p>
        <p style="line-height: 1.6; margin: 0 0 20px;">Your account and existing summaries are still available. Choose Basic or Pro to generate new summaries, use chat, and restart your weekday newsletters.</p>
        <a href="https://feedtldr.com/pricing" style="{BUTTON_STYLE}">Compare plans</a>
        <p style="margin: 24px 0 0; font-size: 14px; color: {MUTED};">
            If you have any questions about our plans or need assistance, please <a href="mailto:support@feedtldr.com" style="color: {FOREST};">contact our support team</a>.
        </p>
    </div>
    """


# ============================================================
# CREATE EMAIL TEMPLATE
# ============================================================
def create_email_template(email_content, email_footer, email_header=None):
    """
    Creates an email template with the defined style and adds the header,
    content and footer, wrapped in a full HTML document so clients keep
    the embedded content styles.
    """
    # If no header is provided, create an empty one
    if email_header is None:
        email_header = ""
    body = email_outer_container(email_header + email_content + email_footer)
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>{CONTENT_STYLES}</style>
</head>
<body style="margin: 0; padding: 0; background-color: {BACKGROUND};">
{body}
</body>
</html>"""
