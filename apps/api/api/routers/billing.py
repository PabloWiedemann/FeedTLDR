import os

from fastapi import APIRouter, Depends, HTTPException

from api import schemas
from api.deps import AuthUser, get_current_user, load_credit_state
from backend import stripe_state, utils_firebase
from config.plans_config import PLAN_PROPERTIES

router = APIRouter(prefix="/v1/billing", tags=["billing"])


@router.get("/plans", response_model=schemas.PlansResponse)
def get_plans():
    """Public plan catalog for the pricing page. Price IDs match STRIPE_ENV."""
    stripe_env = (os.getenv("STRIPE_ENV") or "test").lower()
    price_key = f"stripeId_{stripe_env}"
    plans = []
    for plan_id, props in PLAN_PROPERTIES.items():
        if plan_id == "admin":
            continue
        limits = props["limits"]
        price = props.get("price", {})
        price_ids = props.get(price_key, {})
        plans.append(
            schemas.PlanPublic(
                id=plan_id,
                price_month=price.get("month"),
                price_year=price.get("year"),
                max_followers=limits["max_followers"],
                max_tweets_per_generation=limits["max_tweets_per_generation"],
                max_credits=limits["max_credits"],
                price_id_month=price_ids.get("month"),
                price_id_year=price_ids.get("year"),
            )
        )
    return schemas.PlansResponse(plans=plans)


def _stripe_customer_id(uid: str) -> str:
    data = utils_firebase.get_specific_user_data(uid, ["stripe_customer_id"])
    if data is None:
        raise HTTPException(status_code=404, detail="User not registered")
    stripe_id = data.get("stripe_customer_id")
    if not stripe_id:
        raise HTTPException(status_code=400, detail="missing_stripe_customer")
    return stripe_id


@router.post("/checkout", response_model=schemas.UrlResponse)
def create_checkout(
    body: schemas.CheckoutRequest, user: AuthUser = Depends(get_current_user)
):
    stripe_id = _stripe_customer_id(user.uid)
    try:
        url = stripe_state.create_checkout_session(user.uid, stripe_id, body.price_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
    return schemas.UrlResponse(url=url)


@router.post("/portal", response_model=schemas.UrlResponse)
def create_portal(user: AuthUser = Depends(get_current_user)):
    stripe_id = _stripe_customer_id(user.uid)
    try:
        url = stripe_state.create_portal_session(stripe_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")
    return schemas.UrlResponse(url=url)


@router.get("/usage", response_model=schemas.BillingUsageResponse)
def get_usage(user: AuthUser = Depends(get_current_user)):
    data = utils_firebase.get_specific_user_data(user.uid, ["plan", "stripe_customer_id"])
    if data is None:
        raise HTTPException(status_code=404, detail="User not registered")
    plan = data.get("plan") or "free"
    usage_raw = utils_firebase.fetch_plan_usage_data(user.uid).get(plan, {})
    monthly_left, prepaid_left, monthly_limit, prepaid_limit = load_credit_state(
        user.uid, plan, data.get("stripe_customer_id")
    )
    return schemas.BillingUsageResponse(
        plan=plan,
        usage=schemas.UsageCounts(
            n_generations=usage_raw.get("n_generations", 0),
            n_newsletters_sent=usage_raw.get("n_newsletters_sent", 0),
            n_chat_messages=usage_raw.get("n_chat_messages", 0),
            n_followers_scraped=usage_raw.get("n_followers_scraped", 0),
        ),
        credits=schemas.CreditState(
            monthly_left=monthly_left,
            prepaid_left=prepaid_left,
            monthly_limit=monthly_limit,
            prepaid_limit=prepaid_limit,
        ),
    )
