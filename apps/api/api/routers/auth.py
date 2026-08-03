from fastapi import APIRouter, Depends, HTTPException, Request
from firebase_admin import firestore

from api import schemas
from api.deps import AuthUser, get_current_user
from api.security import (
    check_challenge_rate_limit,
    check_registration_rate_limit,
    client_ip,
    issue_signup_challenge,
    require_app_check,
    verify_signup_challenge,
    verify_turnstile,
)
from backend import utils_firebase
from utils_user import register_user_in_db_core

router = APIRouter(prefix="/v1/auth", tags=["auth"])


@router.post(
    "/signup-challenge",
    response_model=schemas.SignupChallengeResponse,
    dependencies=[Depends(require_app_check)],
)
def signup_challenge(body: schemas.SignupChallengeRequest, request: Request):
    """Exchange a successful Turnstile check for an email-bound signup proof."""
    email = body.email.strip().casefold()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    check_challenge_rate_limit(request)
    verify_turnstile(body.turnstile_token, client_ip(request))
    return schemas.SignupChallengeResponse(
        challenge_token=issue_signup_challenge(email)
    )


@router.post("/register", response_model=schemas.RegisterResponse)
def register(
    body: schemas.RegisterRequest,
    request: Request,
    user: AuthUser = Depends(get_current_user),
):
    """Create the Firestore document for a verified Firebase Auth user.

    Stripe customer creation is deferred until checkout. The client creates
    the Auth user first, then calls this with its ID token. Idempotent.
    """
    utils_firebase.initialize_firebase_client()
    doc = firestore.client().collection("customers").document(user.uid).get()
    if doc.exists:
        return schemas.RegisterResponse(created=False, already_registered=True)

    if not user.email_verified:
        raise HTTPException(status_code=403, detail="email_not_verified")
    verify_signup_challenge(body.signup_challenge, user.email)
    check_registration_rate_limit(request)

    register_user_in_db_core(
        uid=user.uid,
        email=user.email,
        name=body.name,
        avatar=body.avatar,
        is_google_auth=body.is_google_auth,
        TOS_accepted=body.tos_accepted,
    )
    return schemas.RegisterResponse(created=True)
