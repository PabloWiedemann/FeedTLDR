"""Request dependencies: Firebase ID-token auth and per-user context loading.

Every router learns who is calling, what they are paying for, and what they can
afford through these. Nothing reconstructs that from a request body.
"""

from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException
from firebase_admin import auth as fb_auth

from api.constants import DEFAULT_PLAN, FIELD_PLAN, FIELD_STRIPE_CUSTOMER_ID
from api.security import verify_app_check_token
from backend import utils_firebase
from config.plans_config import PLAN_PROPERTIES
from utils import get_all_purchased_prepaid_credits_stripe, get_logger

logger = get_logger("main_logger")


@dataclass
class AuthUser:
    uid: str
    email: str
    email_verified: bool


@dataclass
class UserContext:
    """A registered user: who they are and what they are subscribed to."""

    uid: str
    email: str
    plan: str
    stripe_customer_id: str | None


@dataclass
class CreditState:
    """Credits available now, and the allowance they came from."""

    monthly_left: int
    prepaid_left: int
    monthly_limit: int
    prepaid_limit: int

    @property
    def total_left(self) -> int:
        return self.monthly_left + self.prepaid_left

    def as_tuple(self) -> tuple[int, int, int, int]:
        """The positional form the frozen backend's credit helpers expect."""
        return (
            self.monthly_left,
            self.prepaid_left,
            self.monthly_limit,
            self.prepaid_limit,
        )


def ensure_firebase() -> None:
    """Surfaced as 503 so a misconfigured deployment is obvious, not a 500."""
    try:
        utils_firebase.initialize_firebase_client()
    except Exception as e:
        logger.error(f"Firebase initialization failed: {e}")
        raise HTTPException(status_code=503, detail="Firebase is not configured")


def get_current_user(
    authorization: str = Header(default=""),
    x_firebase_appcheck: str | None = Header(default=None, alias="X-Firebase-AppCheck"),
) -> AuthUser:
    """Verify the Firebase ID token from the Authorization header.

    The uid and email always come from the verified token, never from the
    request body or query string.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()

    ensure_firebase()
    verify_app_check_token(x_firebase_appcheck)
    try:
        decoded = fb_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return AuthUser(
        uid=decoded["uid"],
        email=decoded.get("email") or "",
        email_verified=bool(decoded.get("email_verified")),
    )


def known_plan(plan: str | None, uid: str = "") -> str:
    """Plans are read from a document a human could have edited."""
    if plan in PLAN_PROPERTIES:
        return plan
    if plan:
        logger.warning(f"Unknown plan '{plan}' for uid {uid}; treating as free")
    return DEFAULT_PLAN


def get_user_context(user: AuthUser = Depends(get_current_user)) -> UserContext:
    """Load the caller's plan and Stripe customer. 404 if they were never
    registered, which is the one state the client must handle differently."""
    data = utils_firebase.get_specific_user_data(
        user.uid, [FIELD_PLAN, FIELD_STRIPE_CUSTOMER_ID]
    )
    if data is None:
        raise HTTPException(status_code=404, detail="User not registered")
    return UserContext(
        uid=user.uid,
        email=user.email,
        plan=known_plan(data.get(FIELD_PLAN), user.uid),
        stripe_customer_id=data.get(FIELD_STRIPE_CUSTOMER_ID),
    )


def load_credit_state(
    uid: str, plan: str, stripe_customer_id: str | None
) -> CreditState:
    """Credits left, using the same primitives the legacy app used. A Stripe
    outage degrades to "no prepaid credits" rather than failing the request."""
    monthly_limit = PLAN_PROPERTIES[plan]["limits"]["max_credits"]
    prepaid_limit = 0
    if stripe_customer_id:
        try:
            prepaid_limit = get_all_purchased_prepaid_credits_stripe(stripe_customer_id)
        except Exception as e:
            logger.warning(f"Could not load prepaid credits from Stripe: {e}")

    monthly_left, prepaid_left = utils_firebase.compute_credits_left(
        uid, plan, monthly_limit, prepaid_limit
    )
    return CreditState(monthly_left, prepaid_left, monthly_limit, prepaid_limit)


def get_credit_state(user: UserContext = Depends(get_user_context)) -> CreditState:
    return load_credit_state(user.uid, user.plan, user.stripe_customer_id)
