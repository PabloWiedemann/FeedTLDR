"""Request dependencies: Firebase ID-token auth and per-user context loading."""

from dataclasses import dataclass

from fastapi import Header, HTTPException
from firebase_admin import auth as fb_auth

from backend import utils_firebase
from config.plans_config import PLAN_PROPERTIES
from utils import get_logger, get_all_purchased_prepaid_credits_stripe

logger = get_logger("main_logger")


@dataclass
class AuthUser:
    uid: str
    email: str


def _ensure_firebase() -> None:
    try:
        utils_firebase.initialize_firebase_client()
    except Exception as e:  # surfaced as 503 so misconfig is obvious, not a 500
        logger.error(f"Firebase initialization failed: {e}")
        raise HTTPException(status_code=503, detail="Firebase is not configured")


def get_current_user(authorization: str = Header(default="")) -> AuthUser:
    """Verify the Firebase ID token from the Authorization header.

    The uid/email always come from the verified token, never from the request
    body or query string.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()

    _ensure_firebase()
    try:
        decoded = fb_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    email = decoded.get("email") or ""
    return AuthUser(uid=decoded["uid"], email=email)


def get_plan(uid: str) -> str:
    data = utils_firebase.get_specific_user_data(uid, ["plan"])
    plan = data.get("plan") or "free"
    if plan not in PLAN_PROPERTIES:
        logger.warning(f"Unknown plan '{plan}' for uid {uid}; treating as free")
        plan = "free"
    return plan


def load_credit_state(uid: str, plan: str, stripe_customer_id: str | None):
    """Compute (monthly_left, prepaid_left, monthly_limit, prepaid_limit) using
    the same primitives the legacy app used. Stripe failures degrade to a
    prepaid limit of 0 instead of failing the request."""
    monthly_limit = PLAN_PROPERTIES[plan]["limits"]["max_credits"]
    prepaid_limit = 0
    if stripe_customer_id:
        try:
            prepaid_limit = get_all_purchased_prepaid_credits_stripe(
                stripe_customer_id
            )
        except Exception as e:
            logger.warning(f"Could not load prepaid credits from Stripe: {e}")
    monthly_left, prepaid_left = utils_firebase.compute_credits_left(
        uid, plan, monthly_limit, prepaid_limit
    )
    return monthly_left, prepaid_left, monthly_limit, prepaid_limit
