from fastapi import APIRouter, Depends, HTTPException

from api import schemas, services
from api.constants import (
    DEFAULT_TIMEZONE,
    FIELD_ACCOUNTS,
    FIELD_AI_PROMPT,
    FIELD_NEWSLETTER_EMAIL,
    FIELD_ONBOARDING_SURVEY,
    FIELD_TIMEZONE,
    FIELD_VERIFIED_ACCOUNTS,
)
from api.deps import AuthUser, UserContext, get_current_user, get_user_context
from backend import utils_firebase
from config.plans_config import PLAN_PROPERTIES

router = APIRouter(prefix="/v1/settings", tags=["settings"])

# Request field -> Firestore field, so reads and writes cannot disagree.
_SETTINGS_FIELDS = {
    "timezone": FIELD_TIMEZONE,
    "ai_prompt": FIELD_AI_PROMPT,
    "newsletter_email": FIELD_NEWSLETTER_EMAIL,
}


@router.get("", response_model=schemas.GlobalSettings)
def get_settings(user: AuthUser = Depends(get_current_user)):
    data = utils_firebase.get_specific_user_data(
        user.uid, list(_SETTINGS_FIELDS.values())
    )
    if data is None:
        raise HTTPException(status_code=404, detail="User not registered")
    return schemas.GlobalSettings(
        timezone=data.get(FIELD_TIMEZONE) or DEFAULT_TIMEZONE,
        ai_prompt=data.get(FIELD_AI_PROMPT) or "",
        newsletter_email=data.get(FIELD_NEWSLETTER_EMAIL) or "",
    )


@router.put("", response_model=schemas.GlobalSettings)
def update_settings(
    body: schemas.UpdateSettingsRequest, user: AuthUser = Depends(get_current_user)
):
    updates = {
        field: getattr(body, name)
        for name, field in _SETTINGS_FIELDS.items()
        if getattr(body, name) is not None
    }
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    if not utils_firebase.update_data_firestore_DB(user.uid, updates):
        raise HTTPException(status_code=500, detail="Failed to update settings")
    return get_settings(user)


@router.get("/accounts", response_model=schemas.AccountsResponse)
def get_accounts(user: UserContext = Depends(get_user_context)):
    data = (
        utils_firebase.get_specific_user_data(
            user.uid, [FIELD_ACCOUNTS, FIELD_VERIFIED_ACCOUNTS]
        )
        or {}
    )
    return schemas.AccountsResponse(
        accounts=data.get(FIELD_ACCOUNTS) or [],
        verified_accounts=data.get(FIELD_VERIFIED_ACCOUNTS) or [],
        max_accounts=PLAN_PROPERTIES[user.plan]["limits"]["max_followers"],
    )


@router.get(
    "/accounts/suggestions",
    response_model=schemas.AccountSuggestionsResponse,
)
def get_account_suggestions(user: UserContext = Depends(get_user_context)):
    """Accounts worth following, picked from the onboarding answers."""
    data = (
        utils_firebase.get_specific_user_data(
            user.uid, [FIELD_ACCOUNTS, FIELD_ONBOARDING_SURVEY]
        )
        or {}
    )
    return schemas.AccountSuggestionsResponse(
        suggestions=services.suggested_for(
            data.get(FIELD_ONBOARDING_SURVEY), data.get(FIELD_ACCOUNTS) or []
        )
    )


@router.post("/accounts", response_model=schemas.AccountsResponse)
def add_accounts(
    body: schemas.AddAccountsRequest, user: UserContext = Depends(get_user_context)
):
    services.add_accounts(user.uid, user.plan, body.handles)
    return get_accounts(user)


@router.delete("/accounts", response_model=schemas.AccountsResponse)
def clear_accounts(user: UserContext = Depends(get_user_context)):
    services.clear_accounts(user.uid)
    return get_accounts(user)


@router.delete("/accounts/{handle}", response_model=schemas.AccountsResponse)
def delete_account(handle: str, user: UserContext = Depends(get_user_context)):
    services.remove_account(user.uid, handle)
    return get_accounts(user)


@router.post("/accounts/verify", response_model=schemas.VerifyAccountsResponse)
def verify_accounts(user: UserContext = Depends(get_user_context)):
    try:
        result = services.verify_accounts(user.uid)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Verification failed: {e}")
    return schemas.VerifyAccountsResponse(**result)


@router.post("/accounts/import", response_model=schemas.ImportAccountsResponse)
def import_accounts(
    body: schemas.ImportAccountsRequest, user: UserContext = Depends(get_user_context)
):
    try:
        result = services.import_followees(user.uid, user.plan, body.source)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Import failed: {e}")
    return schemas.ImportAccountsResponse(**result)
