from fastapi import APIRouter, Depends, HTTPException

from api import schemas, services
from api.constants import (
    ERROR_GENERATION_IN_PROGRESS,
    FIELD_ACCOUNTS,
    FIELD_PIPELINE_END,
    FIELD_PIPELINE_ERROR,
    FIELD_PIPELINE_STAGE,
    FIELD_PIPELINE_STAGES_DONE,
    FIELD_PIPELINE_START,
    FIELD_PIPELINE_STATE,
    FIELD_VERIFIED_ACCOUNTS,
)
from api.deps import CreditState, UserContext, get_credit_state, get_user_context
from backend import utils_firebase

router = APIRouter(prefix="/v1/generations", tags=["generations"])

# Only a run already in flight is a conflict; the rest are bad requests.
_CONFLICT_CODES = {ERROR_GENERATION_IN_PROGRESS}

_STATUS_FIELDS = [
    FIELD_PIPELINE_STAGE,
    FIELD_PIPELINE_STATE,
    FIELD_PIPELINE_STAGES_DONE,
    FIELD_PIPELINE_ERROR,
    FIELD_PIPELINE_START,
    FIELD_PIPELINE_END,
]


@router.get("/cost", response_model=schemas.GenerationCostResponse)
def generation_cost(
    fetch_latest: bool = True,
    skip_audio: bool = False,
    user: UserContext = Depends(get_user_context),
    credits: CreditState = Depends(get_credit_state),
):
    cost = services.compute_generation_cost(user.plan, fetch_latest, skip_audio)
    accounts = (
        utils_firebase.get_specific_user_data(
            user.uid, [FIELD_ACCOUNTS, FIELD_VERIFIED_ACCOUNTS]
        )
        or {}
    )
    blockers = services.generation_blockers(
        accounts.get(FIELD_ACCOUNTS) or [],
        accounts.get(FIELD_VERIFIED_ACCOUNTS) or [],
        credits.total_left,
        cost,
    )

    return schemas.GenerationCostResponse(
        cost=cost,
        credits=schemas.CreditState.from_state(credits),
        can_generate=not blockers,
        blockers=blockers,
    )


@router.post("", response_model=schemas.Message, status_code=202)
def start_generation(
    body: schemas.StartGenerationRequest,
    user: UserContext = Depends(get_user_context),
    credits: CreditState = Depends(get_credit_state),
):
    try:
        services.start_generation(
            uid=user.uid,
            email=user.email,
            plan=user.plan,
            fetch_latest=body.fetch_latest,
            prompt=body.prompt,
            skip_audio=body.skip_audio,
            skip_email=body.skip_email,
            credit_state=credits.as_tuple(),
        )
    except ValueError as e:
        code = str(e)
        status = 409 if code in _CONFLICT_CODES else 400
        raise HTTPException(status_code=status, detail=code)
    return schemas.Message(detail="generation_started")


@router.get("/status", response_model=schemas.GenerationStatus)
def generation_status(user: UserContext = Depends(get_user_context)):
    """The polling seam: reads the same pipeline_status document the pipeline
    writes stage transitions to."""
    data = utils_firebase.get_specific_user_data(user.uid, _STATUS_FIELDS) or {}
    return schemas.GenerationStatus(
        current_stage=data.get(FIELD_PIPELINE_STAGE) or "",
        status=data.get(FIELD_PIPELINE_STATE) or "",
        stages_completed=data.get(FIELD_PIPELINE_STAGES_DONE) or [],
        error=data.get(FIELD_PIPELINE_ERROR),
        start_time=data.get(FIELD_PIPELINE_START),
        end_time=data.get(FIELD_PIPELINE_END),
    )
