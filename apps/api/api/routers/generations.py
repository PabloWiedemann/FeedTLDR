from fastapi import APIRouter, Depends, HTTPException

from api import schemas, services
from api.deps import AuthUser, get_current_user, load_credit_state
from backend import utils_firebase

router = APIRouter(prefix="/v1/generations", tags=["generations"])

_ERROR_STATUS = {
    "generation_in_progress": 409,
    "no_accounts": 400,
    "no_verified_accounts": 400,
    "insufficient_credits": 400,
}


def _user_context(uid: str):
    data = utils_firebase.get_specific_user_data(uid, ["plan", "stripe_customer_id"])
    if data is None:
        raise HTTPException(status_code=404, detail="User not registered")
    plan = data.get("plan") or "free"
    return plan, data.get("stripe_customer_id")


@router.get("/cost", response_model=schemas.GenerationCostResponse)
def generation_cost(
    fetch_latest: bool = True,
    skip_audio: bool = False,
    user: AuthUser = Depends(get_current_user),
):
    plan, stripe_id = _user_context(user.uid)
    monthly_left, prepaid_left, monthly_limit, prepaid_limit = load_credit_state(
        user.uid, plan, stripe_id
    )
    cost = services.compute_generation_cost(plan, fetch_latest, skip_audio)

    accounts_data = utils_firebase.get_specific_user_data(
        user.uid, ["settings_X.accounts", "settings_X.verified_accounts"]
    ) or {}
    blockers = services.generation_blockers(
        accounts_data.get("settings_X.accounts") or [],
        accounts_data.get("settings_X.verified_accounts") or [],
        monthly_left + prepaid_left,
        cost,
    )

    return schemas.GenerationCostResponse(
        cost=cost,
        credits=schemas.CreditState(
            monthly_left=monthly_left,
            prepaid_left=prepaid_left,
            monthly_limit=monthly_limit,
            prepaid_limit=prepaid_limit,
        ),
        can_generate=not blockers,
        blockers=blockers,
    )


@router.post("", response_model=schemas.Message, status_code=202)
def start_generation(
    body: schemas.StartGenerationRequest, user: AuthUser = Depends(get_current_user)
):
    plan, stripe_id = _user_context(user.uid)
    credit_state = load_credit_state(user.uid, plan, stripe_id)
    try:
        services.start_generation(
            uid=user.uid,
            email=user.email,
            plan=plan,
            fetch_latest=body.fetch_latest,
            prompt=body.prompt,
            skip_audio=body.skip_audio,
            skip_email=body.skip_email,
            credit_state=credit_state,
        )
    except ValueError as e:
        code = str(e)
        raise HTTPException(
            status_code=_ERROR_STATUS.get(code, 400), detail=code
        )
    return schemas.Message(detail="generation_started")


@router.get("/status", response_model=schemas.GenerationStatus)
def generation_status(user: AuthUser = Depends(get_current_user)):
    """The polling seam: reads the same pipeline_status document the pipeline
    writes stage transitions to (poll every 5-8s, like the legacy dialog)."""
    data = utils_firebase.get_specific_user_data(
        user.uid,
        [
            "pipeline_status.current_stage",
            "pipeline_status.status",
            "pipeline_status.stages_completed",
            "pipeline_status.error",
            "pipeline_status.start_time",
            "pipeline_status.end_time",
        ],
    )
    if data is None:
        raise HTTPException(status_code=404, detail="User not registered")
    return schemas.GenerationStatus(
        current_stage=data.get("pipeline_status.current_stage") or "",
        status=data.get("pipeline_status.status") or "",
        stages_completed=data.get("pipeline_status.stages_completed") or [],
        error=data.get("pipeline_status.error"),
        start_time=data.get("pipeline_status.start_time"),
        end_time=data.get("pipeline_status.end_time"),
    )
