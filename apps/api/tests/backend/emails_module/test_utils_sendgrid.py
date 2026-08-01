from backend.emails_module import utils_sendgrid


def test_send_email():
    target_email = ["wablomann@gmail.com", "drsimonwiedemann@gmail.com"]
    content = "This is a test email"
    success = utils_sendgrid.send_email(target_email, content)
    print(f"✅ Test email sent successfully: {success}")
    assert success, "Email sending failed"


def test_send_free_plan_end_notification():
    target_email = "drsimonwiedemann@gmail.com"
    success = utils_sendgrid.send_free_plan_end_notification(target_email)
    print(f"✅ Test email sent successfully: {success}")
    assert success, "Email sending failed"
