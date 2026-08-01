from fastapi import APIRouter, Depends, HTTPException

from api import schemas, services
from api.deps import AuthUser, get_current_user, load_credit_state
from backend import utils_firebase
from backend.emails_module.utils_sendgrid import send_delete_account_email

router = APIRouter(prefix="/v1/me", tags=["me"])

_ME_FIELDS = [
    "email",
    "name",
    "avatar",
    "created_at",
    "plan",
    "stripe_customer_id",
    "TOS_accepted",
    "onboarded",
    "onboarding_step",
]


@router.get("", response_model=schemas.MeResponse)
def get_me(user: AuthUser = Depends(get_current_user)):
    data = utils_firebase.get_specific_user_data(user.uid, _ME_FIELDS)
    if not data:
        raise HTTPException(status_code=404, detail="User not registered")

    plan_info = services.sync_plan_with_stripe(
        user.uid, user.email, data.get("plan") or "free"
    )
    plan = plan_info["plan"]

    usage_raw = utils_firebase.fetch_plan_usage_data(user.uid).get(plan, {})
    monthly_left, prepaid_left, monthly_limit, prepaid_limit = load_credit_state(
        user.uid, plan, data.get("stripe_customer_id")
    )

    return schemas.MeResponse(
        uid=user.uid,
        email=user.email,
        name=data.get("name") or "",
        avatar=data.get("avatar") or "",
        created_at=data.get("created_at") or "",
        plan=plan,
        plan_info=schemas.PlanInfo(
            period=plan_info["period"],
            status=plan_info["status"],
            cancel_at_period_end=plan_info["cancel_at_period_end"],
            current_period_start=plan_info["current_period_start"],
            current_period_end=plan_info["current_period_end"],
        ),
        tos_accepted=bool(data.get("TOS_accepted")),
        onboarded=bool(data.get("onboarded")),
        onboarding_step=int(data.get("onboarding_step") or 0),
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


@router.patch("", response_model=schemas.Message)
def update_me(body: schemas.UpdateMeRequest, user: AuthUser = Depends(get_current_user)):
    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.timezone is not None:
        updates["settings_global.timezone"] = body.timezone
    if body.tos_accepted is not None:
        updates["TOS_accepted"] = body.tos_accepted
    if body.onboarded is not None:
        updates["onboarded"] = body.onboarded
    if body.onboarding_step is not None:
        updates["onboarding_step"] = body.onboarding_step
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    ok = utils_firebase.update_data_firestore_DB(user.uid, updates)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update profile")
    return schemas.Message(detail="updated")


@router.delete("", response_model=schemas.Message)
def delete_me(user: AuthUser = Depends(get_current_user)):
    """Delete the account: confirmation email, then Firebase Auth + Firestore
    (parity with the legacy profile delete flow)."""
    try:
        send_delete_account_email(user.email)
    except Exception:
        pass  # deletion proceeds even if the email fails
    utils_firebase.delete_user_from_firebase(user.uid)
    return schemas.Message(detail="account_deleted")
