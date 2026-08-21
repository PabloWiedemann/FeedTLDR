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
