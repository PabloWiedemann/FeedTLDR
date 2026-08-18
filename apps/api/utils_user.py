"""User/account helpers. Trimmed to the pure (non-Streamlit) functions from the
legacy utils_user.py; auth itself moved to Firebase Auth on the client with
ID-token verification in the API (see docs/PLAN.md section 1.3).

Kept from the legacy app: get_all_users_timezones,
get_user_subscription_info_from_stripe.
Extracted: register_user_in_db_core (the Firestore/Stripe core of the legacy
register_user_in_db, minus auth.create_user which the client SDK now performs).
"""

import os
import pytz
from datetime import datetime
from dotenv import load_dotenv
from firebase_admin import firestore
from backend import utils_firebase
from config.prompt_config import DEFAULT_X_PROMPT, DEFAULT_X_ACCOUNTS
from utils import get_logger
import stripe


load_dotenv()

stripe_env = os.getenv("STRIPE_ENV")
if stripe_env:
    stripe.api_key = os.environ.get(f"STRIPE_API_KEY_{stripe_env.upper()}")

logger = get_logger(name="main_logger")

DEFAULT_USER_TIMEZONE = "America/New_York"


def register_user_in_db_core(
    uid,
    email,
    name="",
    avatar="",
    is_google_auth=False,
    TOS_accepted=False,
):
    """
    Create the Stripe customer and the Firestore customer document for an
    already-authenticated Firebase user. The uid/email must come from a
    verified ID token, never from client input.

    Returns the created user_data dict. Raises on failure.
    """
    # Data to store (structure identical to the legacy register_user_in_db)
    user_data = {
        "name": name,
        "avatar": avatar,
        "email": email,
        "created_at": datetime.now(pytz.UTC).strftime("%a, %b %d, %Y, %I:%M%p"),
        "is_google_account": is_google_auth,
        "plan": "free",
        "n_prepaid_credits": 0,
        # Lifetime counter. Unlike monthly plan_usage, this is never reset, so
        # upgrading and later downgrading cannot grant another free trial.
        "trial_credits_used": 0,
        "plan_usage": {
            "admin": {
                "n_generations": 0,
                "n_newsletters_sent": 0,
                "n_chat_messages": 0,
                "n_followers_scraped": 0,
                "n_credits": 0,
            },
            "free": {
                "n_generations": 0,
                "n_newsletters_sent": 0,
                "n_chat_messages": 0,
                "n_followers_scraped": 0,
                "n_credits": 0,
            },
            "basic": {
                "n_generations": 0,
                "n_newsletters_sent": 0,
                "n_chat_messages": 0,
                "n_followers_scraped": 0,
                "n_credits": 0,
            },
            "pro": {
                "n_generations": 0,
                "n_newsletters_sent": 0,
                "n_chat_messages": 0,
                "n_followers_scraped": 0,
                "n_credits": 0,
            },
        },
        "cost_tracker": {
            "scrapers": {},
            "models": {},
        },
        "summary_data": {
            "audio_url": "",
            "last_generation_time": "",
            "summary_html": "",
            "summary_transcript": "",
            "raw_data": "",
            "newsletter_last_generation_time": (
                datetime.now(pytz.timezone("America/New_York"))
                .replace(hour=7, minute=0, second=0, microsecond=0)
                .astimezone(pytz.UTC)
                .strftime("%Y-%m-%d %H:%M:%S UTC(%z)")
                if datetime.now(pytz.timezone("America/New_York")).hour >= 7
                else datetime.now(pytz.timezone("America/New_York"))
                .astimezone(pytz.UTC)
                .strftime("%Y-%m-%d %H:%M:%S UTC(%z)")
            ),
        },
        "settings_global": {
            "timezone": "America/New_York",
            "ai_prompt": DEFAULT_X_PROMPT,
            "newsletter_email": email,
        },
        "settings_X": {
            "accounts": DEFAULT_X_ACCOUNTS,
            "verified_accounts": DEFAULT_X_ACCOUNTS,
        },
        "TOS_accepted": TOS_accepted,
        "onboarded": False,
        "onboarding_step": 0,
        # Created lazily only when the user chooses a paid plan. A free signup
        # therefore needs no card and makes no Stripe API call.
        "stripe_customer_id": "",
    }

    # ======== REGISTER IN FIRESTORE DB ===========
    utils_firebase.initialize_firebase_client()
    firestore_db = firestore.client()

    logger.info(f"Creating Firestore document for user: {uid}")
    customer_doc = firestore_db.collection("customers").document(uid)
    customer_doc.set(user_data)
    # =============================================

    return user_data


def get_all_users_timezones():
    """
    Fetches only email and timezone data for all users from Firestore.
    Returns a list of dictionaries containing email and timezone.
    """
    utils_firebase.initialize_firebase_client()
    firestore_db = firestore.client()
    docs = firestore_db.collection("customers").stream()

    user_data = []
    for doc in docs:
        try:
            settings = doc.get("settings_global") or {}
        except (KeyError, TypeError):
            settings = {}

        timezone_name = settings.get("timezone") or DEFAULT_USER_TIMEZONE
        try:
            pytz.timezone(timezone_name)
        except (pytz.UnknownTimeZoneError, AttributeError):
            logger.warning(
                f"Invalid timezone for user {doc.id}: {timezone_name!r}. "
                f"Falling back to {DEFAULT_USER_TIMEZONE}."
            )
            timezone_name = DEFAULT_USER_TIMEZONE

        user_data.append({"uid": doc.id, "timezone": timezone_name})

    return user_data


def get_user_subscription_info_from_stripe(email):
    customer_id = stripe.Customer.list(email=email)["data"][0]["id"]
    subscriptions = stripe.Subscription.list(customer=customer_id)["data"]
    if len(subscriptions) > 1:
        logger.error(f"Multiple subscriptions found for user {email}.")
        raise ValueError(f"Multiple subscriptions found for user {email}.")
    elif len(subscriptions) == 0:
        return None
    else:
        return subscriptions[0]
