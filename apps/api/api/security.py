"""Signup abuse controls and optional Firebase App Check enforcement."""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import os
import threading
import time
from collections import defaultdict, deque

import requests
from fastapi import Header, HTTPException, Request
from firebase_admin import app_check

from utils import get_logger

logger = get_logger("main_logger")
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


class SlidingWindowLimiter:
    """Small per-process limiter; Cloudflare remains the shared edge limiter."""

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        if limit <= 0:
            return True
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                return False
            events.append(now)
            return True


_challenge_limiter = SlidingWindowLimiter()
_registration_limiter = SlidingWindowLimiter()


def client_ip(request: Request) -> str:
    """Use proxy headers only when the deployment explicitly trusts them."""
    if os.getenv("TRUST_PROXY_HEADERS") == "1":
        cloudflare_ip = request.headers.get("CF-Connecting-IP", "").strip()
        if cloudflare_ip:
            return cloudflare_ip
        forwarded = request.headers.get("X-Forwarded-For", "")
        if forwarded:
            return forwarded.split(",", 1)[0].strip()
    return request.client.host if request.client else "unknown"


def check_challenge_rate_limit(request: Request) -> None:
    limit = int(os.getenv("SIGNUP_CHALLENGE_RATE_LIMIT_PER_HOUR", "0"))
    if not _challenge_limiter.allow(client_ip(request), limit, 60 * 60):
        raise HTTPException(
            status_code=429,
            detail="Too many signup attempts. Please try again later.",
        )


def check_registration_rate_limit(request: Request) -> None:
    limit = int(os.getenv("SIGNUP_RATE_LIMIT_PER_DAY", "0"))
    if not _registration_limiter.allow(client_ip(request), limit, 24 * 60 * 60):
        raise HTTPException(
            status_code=429,
            detail="Too many accounts were created from this connection today.",
        )


def _turnstile_secret() -> str:
    return os.getenv("TURNSTILE_SECRET_KEY", "").strip()


def verify_turnstile(token: str | None, remote_ip: str) -> None:
    """Validate Cloudflare Turnstile server-side when its secret is configured."""
    secret = _turnstile_secret()
    if not secret:
        return
    if not token:
        raise HTTPException(status_code=400, detail="Complete the security check.")

    try:
        response = requests.post(
            TURNSTILE_VERIFY_URL,
            data={"secret": secret, "response": token, "remoteip": remote_ip},
            timeout=8,
        )
        response.raise_for_status()
        result = response.json()
    except (requests.RequestException, ValueError) as e:
        logger.warning(f"Turnstile verification unavailable: {e}")
        raise HTTPException(
            status_code=503,
            detail="The security check is temporarily unavailable. Try again.",
        )

    if not result.get("success"):
        logger.info(f"Turnstile rejected signup: {result.get('error-codes', [])}")
        raise HTTPException(
            status_code=400,
            detail="The security check expired or failed. Please try it again.",
        )

    allowed = {
        value.strip().lower()
        for value in os.getenv("TURNSTILE_ALLOWED_HOSTNAMES", "").split(",")
        if value.strip()
    }
    hostname = str(result.get("hostname") or "").lower()
    if allowed and hostname not in allowed:
        logger.warning(f"Turnstile hostname rejected: {hostname}")
        raise HTTPException(status_code=400, detail="Invalid security check origin.")


def _challenge_key() -> bytes | None:
    secret = os.getenv("SIGNUP_CHALLENGE_SECRET", "").strip() or _turnstile_secret()
    if not secret:
        return None
    return hmac.new(
        secret.encode(), b"feedtldr-signup-challenge-v1", hashlib.sha256
    ).digest()


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def issue_signup_challenge(email: str) -> str:
    """Issue a short-lived signed proof after Turnstile has been validated."""
    key = _challenge_key()
    if key is None:
        return ""
    payload = json.dumps(
        {
            "email": email.strip().casefold(),
            "exp": int(time.time()) + 24 * 60 * 60,
        },
        separators=(",", ":"),
        sort_keys=True,
    ).encode()
    encoded = _b64encode(payload)
    signature = _b64encode(hmac.new(key, encoded.encode(), hashlib.sha256).digest())
    return f"{encoded}.{signature}"


def verify_signup_challenge(token: str | None, email: str) -> None:
    """Require a valid email-bound challenge whenever Turnstile is enabled."""
    key = _challenge_key()
    if key is None:
        return
    try:
        encoded, signature = (token or "").split(".", 1)
        expected = _b64encode(hmac.new(key, encoded.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("signature")
        payload = json.loads(_b64decode(encoded))
        if payload.get("email") != email.strip().casefold():
            raise ValueError("email")
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("expired")
    except (ValueError, TypeError, UnicodeDecodeError, binascii.Error):
        raise HTTPException(
            status_code=400,
            detail="Your signup security check expired. Please complete it again.",
        )


def verify_app_check_token(token: str | None) -> None:
    """Enforce Firebase App Check only after the deployment flag is enabled."""
    if os.getenv("FIREBASE_APP_CHECK_ENFORCED") != "1":
        return
    if not token:
        raise HTTPException(status_code=401, detail="Missing app verification token")
    try:
        app_check.verify_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid app verification token")


def require_app_check(
    x_firebase_appcheck: str | None = Header(default=None, alias="X-Firebase-AppCheck"),
) -> None:
    verify_app_check_token(x_firebase_appcheck)
