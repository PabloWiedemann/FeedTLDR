import os

from fastapi import APIRouter, Depends, HTTPException

from api import schemas
from api.constants import ADMIN_PLAN
from api.deps import CreditState, UserContext, get_credit_state, get_user_context
from backend import stripe_state, utils_firebase
from config.plans_config import PLAN_PROPERTIES

router = APIRouter(prefix="/v1/billing", tags=["billing"])


@router.get("/plans", response_model=schemas.PlansResponse)
def get_plans():
    """Public plan catalog for the pricing page. Price IDs match STRIPE_ENV."""
    price_key = f"stripeId_{(os.getenv('STRIPE_ENV') or 'test').lower()}"
    plans = [
        schemas.PlanPublic(
            id=plan_id,
            price_month=props.get("price", {}).get("month"),
            price_year=props.get("price", {}).get("year"),
            max_followers=props["limits"]["max_followers"],
            max_tweets_per_generation=props["limits"]["max_tweets_per_generation"],
            max_credits=props["limits"]["max_credits"],
            price_id_month=props.get(price_key, {}).get("month"),
            price_id_year=props.get(price_key, {}).get("year"),
        )
        for plan_id, props in PLAN_PROPERTIES.items()
        if plan_id != ADMIN_PLAN
    ]
    return schemas.PlansResponse(plans=plans)


def _require_stripe_customer(user: UserContext) -> str:
    if not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="missing_stripe_customer")
    return user.stripe_customer_id


@router.post("/checkout", response_model=schemas.UrlResponse)
def create_checkout(
    body: schemas.CheckoutRequest, user: UserContext = Depends(get_user_context)
):
    stripe_id = _require_stripe_customer(user)
    try:
        url = stripe_state.create_checkout_session(user.uid, stripe_id, body.price_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
    return schemas.UrlResponse(url=url)


@router.post("/portal", response_model=schemas.UrlResponse)
def create_portal(user: UserContext = Depends(get_user_context)):
    stripe_id = _require_stripe_customer(user)
    try:
        url = stripe_state.create_portal_session(stripe_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
    return schemas.UrlResponse(url=url)


@router.get("/usage", response_model=schemas.BillingUsageResponse)
def get_usage(
    user: UserContext = Depends(get_user_context),
    credits: CreditState = Depends(get_credit_state),
):
    usage = utils_firebase.fetch_plan_usage_data(user.uid).get(user.plan, {})
    return schemas.BillingUsageResponse(
        plan=user.plan,
        usage=schemas.UsageCounts.from_plan_usage(usage),
        credits=schemas.CreditState.from_state(credits),
    )
