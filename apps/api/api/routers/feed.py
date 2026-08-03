from fastapi import APIRouter, Depends, HTTPException

from api import schemas, services
from api.deps import AuthUser, ensure_firebase, get_current_user

router = APIRouter(prefix="/v1", tags=["feed"])


@router.get("/feed", response_model=schemas.FeedResponse)
def get_feed(user: AuthUser = Depends(get_current_user)):
    return schemas.FeedResponse(**services.get_feed(user.uid))


@router.get("/demo/feed", response_model=schemas.FeedResponse)
def get_demo_feed():
    """Public demo summary (the default_user document), used by the marketing
    site and the logged-out preview."""
    ensure_firebase()
    return schemas.FeedResponse(**services.get_demo_feed())


@router.get("/feed/source-data", response_model=schemas.SourceDataResponse)
def get_source_data(user: AuthUser = Depends(get_current_user)):
    try:
        return schemas.SourceDataResponse(**services.get_source_data(user.uid))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
