from fastapi import APIRouter, Depends
from firebase_admin import firestore

from api import schemas
from api.deps import AuthUser, get_current_user
from backend import utils_firebase
from utils_user import register_user_in_db_core

router = APIRouter(prefix="/v1/auth", tags=["auth"])


@router.post("/register", response_model=schemas.RegisterResponse)
def register(body: schemas.RegisterRequest, user: AuthUser = Depends(get_current_user)):
    """Create the Stripe customer + Firestore document for a freshly created
    Firebase Auth user. The client creates the Auth user first (Firebase JS
    SDK), then calls this with its ID token. Idempotent."""
    utils_firebase.initialize_firebase_client()
    doc = firestore.client().collection("customers").document(user.uid).get()
    if doc.exists:
        return schemas.RegisterResponse(created=False, already_registered=True)

    register_user_in_db_core(
        uid=user.uid,
        email=user.email,
        name=body.name,
        avatar=body.avatar,
        is_google_auth=body.is_google_auth,
        TOS_accepted=body.tos_accepted,
    )
    return schemas.RegisterResponse(created=True)
