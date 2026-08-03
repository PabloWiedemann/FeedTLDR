from fastapi import APIRouter, Depends, HTTPException

from api import schemas, services
from api.deps import (
    AuthUser,
    CreditState,
    get_current_user,
    load_credit_state,
)
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

# Request field -> Firestore field. The profile spans two documents' worth of
# naming conventions, so the mapping is stated once.
_PROFILE_UPDATES = {
    "name": "name",
    "timezone": "settings_global.timezone",
    "tos_accepted": "TOS_accepted",
    "onboarded": "onboarded",
    "onboarding_step": "onboarding_step",
}


@router.get("", response_model=schemas.MeResponse)
def get_me(user: AuthUser = Depends(get_current_user)):
    data = utils_firebase.get_specific_user_data(user.uid, _ME_FIELDS)
    if not data:
        raise HTTPException(status_code=404, detail="User not registered")

    plan_info = services.sync_plan_with_stripe(
        user.uid, user.email, data.get("plan") or "free"
    )
    plan = plan_info["plan"]
    credits: CreditState = load_credit_state(
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
        usage=schemas.UsageCounts.from_plan_usage(
            utils_firebase.fetch_plan_usage_data(user.uid).get(plan, {})
        ),
        credits=schemas.CreditState.from_state(credits),
    )


@router.patch("", response_model=schemas.Message)
def update_me(body: schemas.UpdateMeRequest, user: AuthUser = Depends(get_current_user)):
    updates = {
        field: getattr(body, name)
        for name, field in _PROFILE_UPDATES.items()
        if getattr(body, name) is not None
    }
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    if not utils_firebase.update_data_firestore_DB(user.uid, updates):
        raise HTTPException(status_code=500, detail="Failed to update profile")
    return schemas.Message(detail="updated")


@router.delete("", response_model=schemas.Message)
def delete_me(user: AuthUser = Depends(get_current_user)):
    """Delete the account: confirmation email, then Firebase Auth + Firestore
    (parity with the legacy profile delete flow)."""
    try:
        send_delete_account_email(user.email)
    except Exception:
        pass  # a failed courtesy email must not block the deletion
    utils_firebase.delete_user_from_firebase(user.uid)
    return schemas.Message(detail="account_deleted")
