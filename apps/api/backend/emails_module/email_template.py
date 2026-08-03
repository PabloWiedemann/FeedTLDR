# ============================================================
# Email Styling Components (background, outer container, etc.)
# ============================================================
def email_background_component(component):
    return f"""
        <table width="100%" 
               border="0" 
               cellspacing="0" 
               cellpadding="0" 
               bgcolor="#FBF9F6" 
               style="background-color: #FBF9F6; 
                      font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Segoe UI', Arial, sans-serif;">
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
    <div style="
        margin: 0 auto;
        max-width: 600px;
        min-width: 320px;
        width: 100%;
        background-color: #FFFFFF;
        border-radius: 24px;
        padding: 24px 40px;
    ">
        {email_content}
    </div>
    """
    )


# ============================================================
# Email Header(s) and Footer(s)
# ============================================================
def get_email_footer():
    return """
    <div style="margin-top: 48px; padding-top: 30px; padding-left: 24px; padding-right: 24px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        <p>This email was sent by FeedTLDR</p>
        <p>
            <a href="https://feedtldr.com/settings" style="color: #666; text-decoration: underline;">Manage email preferences</a> | 
            <a href="https://feedtldr.com/settings" style="color: #666; text-decoration: underline;">Unsubscribe</a>
        </p>
        <p style="color: #999;">Please do not reply to this email. For support, contact us at <a href="mailto:info@toriml.com" style="color: #666;">info@toriml.com</a>.</p>
    </div>
    """


def get_header_with_logo_and_audio(audio_url=None):
    LOGO_URL = "http://cdn.mcauto-images-production.sendgrid.net/162b8be545e2fb59/5825d57e-5d5a-48c0-a795-1d1d6c0d2956/1083x670.png"
    audio_link = (
        f"""
                <div style="margin-top: 16px;">
                    <a href="{audio_url}" style="
                        color: #666;
                        text-decoration: none;
                        font-size: 14px;
                        background-color: transparent;
                        padding: 8px 16px;
                        border-radius: 20px;
                        border: 1px solid #e0e0e0;
                        display: inline-block;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    ">🔉 Listen to audio version</a>
                </div>
                """
        if audio_url
        else ""
    )
    return f"""
            <div style="text-align: center; margin-top: 24px; margin-bottom: 48px;">
                <a href="https://feedtldr.com">
                    <img src="{LOGO_URL}" alt="FeedTLDR Logo" style="max-width: 100px; margin-bottom: 16px;">
                </a>
                <div>
                    <a href="https://feedtldr.com" style="color: #666; text-decoration: underline; font-size: 14px;">View online</a>
                </div>
                {audio_link}
            </div>
            <br>
    """


# ============================================================
# Email Content
# ============================================================
def get_generation_success_content():
    return """
    <div style="text-align: center; padding-top: 24px; padding-bottom: 24px;">
        <h2>Your content has successfully been generated ✅ </h2> 
        <p>You can now view it in the FeedTLDR app</p>
        <p><a href="https://feedtldr.com">https://feedtldr.com</a></p>
    </div>
    """


def get_newsletter_subscription_success_content():
    return """
    <div style="text-align: center; padding-top: 24px; padding-bottom: 24px;">
        <h2>Welcome to FeedTLDR's Daily Newsletter! 🎉</h2>
        <p>You're all set to receive daily email summaries of your social media feed.</p>
        <p>Visit your <a href="https://feedtldr.com">FeedTLDR dashboard</a> to customize your preferences.</p>
    </div>
    """


def get_unsubscribe_confirmation_content():
    return """
    <div style="text-align: center; padding-top: 24px; padding-bottom: 24px;">
        <h2>You have successfully unsubscribed from FeedTLDR's Daily Newsletter.</h2>
        <p>You won't receive any more emails from us.</p>
        <p>If this was a mistake, you can <a href="https://feedtldr.com/settings">resubscribe here</a>.</p>
    </div>
    """


def get_delete_account_content():
    return """
    <div style="text-align: center; padding-top: 24px; padding-bottom: 24px;">
        <h2>Your FeedTLDR Account Has Been Deleted</h2>
        <p>We're sorry to see you go. Let us know if there's anything we could have done to keep you on board.</p>
        <p>You can <a href="mailto:info@toriml.com">contact us here</a>.</p>
    </div>
    """


def get_free_plan_end_notification_content():
    return """
    <div style="text-align: center; padding-top: 24px; padding-bottom: 24px;">
        <h2>Your Free Daily Summaries Are Paused</h2>
        <p>You no longer have enough trial credits for another daily summary and newsletter.</p>
        <p>Your account and existing summaries are still available. Choose Basic or Pro to generate new summaries, use chat, and restart your weekday newsletters.</p>
        <div style="margin-top: 24px;">
            <a href="https://feedtldr.com/pricing" style="
                background-color: #4A90E2;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 4px;
                font-weight: bold;
                display: inline-block;
            ">Compare Plans</a>
        </div>
        <p style="margin-top: 24px; font-size: 14px; color: #666;">
            If you have any questions about our plans or need assistance, please <a href="mailto:info@toriml.com" style="color: #4A90E2; text-decoration: underline;">contact our support team</a>.
        </p>
    </div>
    """


# ============================================================
# CREATE EMAIL TEMPLATE
# ============================================================
def create_email_template(email_content, email_footer, email_header=None):
    """
    Creates an email template with the defined style and adds the header, content and footer
    """
    # If no header is provided, create an empty one
    if email_header is None:
        email_header = ""
    return email_outer_container(email_header + email_content + email_footer)
