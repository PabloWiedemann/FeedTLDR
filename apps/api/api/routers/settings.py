from fastapi import APIRouter, Depends, HTTPException

from api import schemas, services
from api.deps import AuthUser, get_current_user, get_plan
from backend import utils_firebase
from config.plans_config import PLAN_PROPERTIES

router = APIRouter(prefix="/v1/settings", tags=["settings"])


@router.get("", response_model=schemas.GlobalSettings)
def get_settings(user: AuthUser = Depends(get_current_user)):
    data = utils_firebase.get_specific_user_data(
        user.uid,
        [
            "settings_global.timezone",
            "settings_global.ai_prompt",
            "settings_global.newsletter_email",
        ],
    )
    if data is None:
        raise HTTPException(status_code=404, detail="User not registered")
    return schemas.GlobalSettings(
        timezone=data.get("settings_global.timezone") or "America/New_York",
        ai_prompt=data.get("settings_global.ai_prompt") or "",
        newsletter_email=data.get("settings_global.newsletter_email") or "",
    )


@router.put("", response_model=schemas.GlobalSettings)
def update_settings(
    body: schemas.UpdateSettingsRequest, user: AuthUser = Depends(get_current_user)
):
    updates: dict = {}
    if body.timezone is not None:
        updates["settings_global.timezone"] = body.timezone
    if body.ai_prompt is not None:
        updates["settings_global.ai_prompt"] = body.ai_prompt
    if body.newsletter_email is not None:
        updates["settings_global.newsletter_email"] = str(body.newsletter_email)
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    ok = utils_firebase.update_data_firestore_DB(user.uid, updates)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update settings")
    return get_settings(user)


@router.get("/accounts", response_model=schemas.AccountsResponse)
def get_accounts(user: AuthUser = Depends(get_current_user)):
    data = utils_firebase.get_specific_user_data(
        user.uid, ["settings_X.accounts", "settings_X.verified_accounts", "plan"]
    )
    if data is None:
        raise HTTPException(status_code=404, detail="User not registered")
    plan = data.get("plan") or "free"
    if plan not in PLAN_PROPERTIES:
        plan = "free"
    return schemas.AccountsResponse(
        accounts=data.get("settings_X.accounts") or [],
        verified_accounts=data.get("settings_X.verified_accounts") or [],
        max_accounts=PLAN_PROPERTIES[plan]["limits"]["max_followers"],
    )


@router.post("/accounts", response_model=schemas.AccountsResponse)
def add_accounts(
    body: schemas.AddAccountsRequest, user: AuthUser = Depends(get_current_user)
):
    plan = get_plan(user.uid)
    services.add_accounts(user.uid, plan, body.handles)
    return get_accounts(user)


@router.delete("/accounts/{handle}", response_model=schemas.AccountsResponse)
def delete_account(handle: str, user: AuthUser = Depends(get_current_user)):
    services.remove_account(user.uid, handle)
    return get_accounts(user)


@router.post("/accounts/verify", response_model=schemas.VerifyAccountsResponse)
def verify_accounts(user: AuthUser = Depends(get_current_user)):
    try:
        result = services.verify_accounts(user.uid)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Verification failed: {e}")
    return schemas.VerifyAccountsResponse(**result)


@router.post("/accounts/import", response_model=schemas.ImportAccountsResponse)
def import_accounts(
    body: schemas.ImportAccountsRequest, user: AuthUser = Depends(get_current_user)
):
    plan = get_plan(user.uid)
    try:
        result = services.import_followees(user.uid, plan, body.source)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Import failed: {e}")
    return schemas.ImportAccountsResponse(**result)
