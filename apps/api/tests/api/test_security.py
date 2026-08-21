import time

import pytest
from fastapi import BackgroundTasks, HTTPException
from starlette.requests import Request

from api import schemas, security
from api.deps import AuthUser
from api.routers import auth


def test_signup_challenge_is_bound_to_email(monkeypatch):
    monkeypatch.setenv("SIGNUP_CHALLENGE_SECRET", "test-secret")
    token = security.issue_signup_challenge("Person@Example.com")

    security.verify_signup_challenge(token, "person@example.com")
    with pytest.raises(HTTPException) as error:
        security.verify_signup_challenge(token, "different@example.com")
    assert error.value.status_code == 400


def test_signup_challenge_rejects_expired_token(monkeypatch):
    monkeypatch.setenv("SIGNUP_CHALLENGE_SECRET", "test-secret")
    monkeypatch.setattr(time, "time", lambda: 100)
    token = security.issue_signup_challenge("person@example.com")
    monkeypatch.setattr(time, "time", lambda: 100 + 24 * 60 * 60 + 1)

    with pytest.raises(HTTPException) as error:
        security.verify_signup_challenge(token, "person@example.com")
    assert error.value.status_code == 400


def test_sliding_window_limiter_blocks_after_limit(monkeypatch):
    now = 100.0
    monkeypatch.setattr(time, "monotonic", lambda: now)
    limiter = security.SlidingWindowLimiter()

    assert limiter.allow("ip", 2, 60)
    assert limiter.allow("ip", 2, 60)
    assert not limiter.allow("ip", 2, 60)


def test_app_check_is_opt_in(monkeypatch):
    monkeypatch.delenv("FIREBASE_APP_CHECK_ENFORCED", raising=False)
    security.verify_app_check_token(None)

    monkeypatch.setenv("FIREBASE_APP_CHECK_ENFORCED", "1")
    with pytest.raises(HTTPException) as error:
        security.verify_app_check_token(None)
    assert error.value.status_code == 401


def test_new_registration_requires_verified_email(monkeypatch):
    class MissingDocument:
        exists = False

    class DocumentReference:
        def get(self):
            return MissingDocument()

    class FirestoreClient:
        def collection(self, _name):
            return self

        def document(self, _uid):
            return DocumentReference()

    monkeypatch.setattr(auth.firestore, "client", lambda: FirestoreClient())
    monkeypatch.setattr(auth.utils_firebase, "initialize_firebase_client", lambda: None)
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/v1/auth/register",
            "headers": [],
            "client": ("127.0.0.1", 1234),
        }
    )

    with pytest.raises(HTTPException) as error:
        auth.register(
            schemas.RegisterRequest(),
            request,
            BackgroundTasks(),
            AuthUser(
                uid="new-user",
                email="person@example.com",
                email_verified=False,
            ),
        )
    assert error.value.status_code == 403
    assert error.value.detail == "email_not_verified"
