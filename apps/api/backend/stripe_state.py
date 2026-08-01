"""Stripe checkout/portal helpers. De-Streamlit-ified in the frontend rebuild:
the legacy StripeCheckoutState read uid/stripe_id from st.session_state and
rendered errors with st.toast; these pure functions take them as arguments and
raise instead (the API layer maps exceptions to HTTP errors).
Behavior is otherwise identical (docs/PLAN.md section 1.3)."""

import os
import stripe
from utils import get_logger
from dotenv import load_dotenv

load_dotenv()

stripe_env = os.getenv("STRIPE_ENV")
if stripe_env:
    stripe.api_key = os.environ.get(f"STRIPE_API_KEY_{stripe_env.upper()}")
YOUR_DOMAIN = os.environ.get("DOMAIN_URL")

logger = get_logger(name="main_logger")


def create_checkout_session(uid: str, stripe_customer_id: str, price_id: str) -> str:
    """Create a Stripe subscription checkout session and return its URL."""
    if not stripe_customer_id:
        logger.error("❌ No Stripe ID provided when trying to go to payment")
        raise ValueError("Stripe customer ID is missing. Cannot proceed to payment.")

    checkout_session = stripe.checkout.Session.create(
        customer=stripe_customer_id,
        line_items=[
            {
                "price": price_id,
                "quantity": 1,
            },
        ],
        mode="subscription",
        client_reference_id=uid,
        success_url=os.path.join(YOUR_DOMAIN, "success"),
        cancel_url=YOUR_DOMAIN,
    )

    return checkout_session.url


def create_portal_session(stripe_customer_id: str) -> str:
    """Create a Stripe Customer Portal session (subscription management) and
    return its URL."""
    if not stripe_customer_id:
        logger.error("❌ No Stripe ID provided when trying to open billing portal")
        raise ValueError("Stripe customer ID is missing. Cannot open billing portal.")

    session = stripe.billing_portal.Session.create(
        customer=stripe_customer_id,
        return_url=os.path.join(YOUR_DOMAIN, "app"),  # Where to return after portal
    )

    return session.url


def create_stripe_customer(user_email, uid=None):
    """Creates a new customer in Stripe and returns the customer ID."""
    new_customer = stripe.Customer.create(
        email=user_email, metadata={"firebase_uid": uid} if uid else None
    )

    return new_customer.id
