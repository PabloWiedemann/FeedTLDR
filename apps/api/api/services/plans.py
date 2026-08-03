"""Plan state: the lazy Firestore/Stripe reconciliation the legacy app ran on
every page load (port of utils_user.update_user_plan)."""

from datetime import datetime

import pytz

from api.constants import ADMIN_PLAN, DEFAULT_PLAN
from backend import utils_firebase
from utils import get_logger
from utils_user import get_user_subscription_info_from_stripe

logger = get_logger("main_logger")


def _unsubscribed(plan: str) -> dict:
    return {
        "plan": plan,
        "period": None,
        "status": None,
        "cancel_at_period_end": False,
        "current_period_start": None,
        "current_period_end": None,
    }


def _demote_to_free(uid: str, current_plan: str) -> dict:
    if current_plan != DEFAULT_PLAN:
        utils_firebase.update_data_firestore_DB(uid, {"plan": DEFAULT_PLAN})
    return _unsubscribed(DEFAULT_PLAN)


def _subscription_has_lapsed(subscription: dict) -> bool:
    """A cancelled subscription still reads as active until its period ends."""
    if not subscription.get("cancel_at_period_end", False):
        return False
    period_end = datetime.fromtimestamp(
        subscription.get("current_period_end"), pytz.UTC
    )
    return datetime.now(pytz.UTC) >= period_end


def _plan_name(subscription: dict) -> str:
    """Stripe stores plan names like "PRO_MONTHLY"; we key on "pro"."""
    return subscription["plan"]["metadata"]["name"].split("_")[0].lower()


def sync_plan_with_stripe(
    uid: str,
    email: str,
    current_plan: str,
    stripe_customer_id: str | None = None,
) -> dict:
    """Reconcile the stored plan with the live Stripe subscription and return
    the plan info the profile shows. Stripe failures leave the stored plan
    alone rather than downgrading someone who is paying."""
    if current_plan == ADMIN_PLAN:
        return _unsubscribed(current_plan)
    # New trial accounts do not get a Stripe customer until checkout.
    if current_plan == DEFAULT_PLAN and not stripe_customer_id:
        return _unsubscribed(current_plan)

    try:
        subscription = get_user_subscription_info_from_stripe(email)
    except Exception as e:
        logger.warning(f"Stripe subscription lookup failed for {email}: {e}")
        return _unsubscribed(current_plan)

    if subscription is None or _subscription_has_lapsed(subscription):
        return _demote_to_free(uid, current_plan)

    plan = _plan_name(subscription)
    if current_plan != plan:
        utils_firebase.update_data_firestore_DB(uid, {"plan": plan})

    return {
        "plan": plan,
        "period": subscription["plan"]["interval"],
        "status": subscription["status"],
        "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
        "current_period_start": subscription.get("current_period_start"),
        "current_period_end": subscription.get("current_period_end"),
    }
