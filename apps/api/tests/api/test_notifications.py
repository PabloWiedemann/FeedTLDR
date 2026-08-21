from api.services import notifications


def _capture_send(monkeypatch):
    calls = []
    monkeypatch.setattr(
        notifications, "send_email", lambda *args, **kwargs: calls.append((args, kwargs))
    )
    return calls


def test_notify_signup_disabled_without_recipient(monkeypatch):
    monkeypatch.delenv("SIGNUP_NOTIFY_EMAIL", raising=False)
    calls = _capture_send(monkeypatch)

    notifications.notify_signup("user@example.com", "Ada")

    assert calls == []


def test_notify_signup_sends_to_operator(monkeypatch):
    monkeypatch.setenv("SIGNUP_NOTIFY_EMAIL", "owner@example.com")
    calls = _capture_send(monkeypatch)

    notifications.notify_signup("user@example.com", "<Ada>")

    ((to_address, content), kwargs) = calls[0]
    assert to_address == "owner@example.com"
    assert "user@example.com" in kwargs["subject"]
    # Name is user input; it must land HTML-escaped
    assert "&lt;Ada&gt;" in content


def test_welcome_email_greets_by_first_name(monkeypatch):
    calls = _capture_send(monkeypatch)

    notifications.send_welcome_email("user@example.com", "Ada Lovelace")

    ((to_address, content), kwargs) = calls[0]
    assert to_address == "user@example.com"
    assert kwargs["subject"] == "Welcome to FeedTLDR"
    assert "Hi Ada," in content


def test_welcome_email_handles_missing_name(monkeypatch):
    calls = _capture_send(monkeypatch)

    notifications.send_welcome_email("user@example.com", "")

    ((_, content), _kwargs) = calls[0]
    assert "Hi," in content
