from fastapi import APIRouter, Depends, HTTPException

from api import schemas, services
from api.deps import (
    CreditState,
    UserContext,
    get_credit_state,
    get_user_context,
    load_credit_state,
)

router = APIRouter(prefix="/v1/chat", tags=["chat"])


@router.post("", response_model=schemas.ChatResponse)
def chat(
    body: schemas.ChatRequest,
    user: UserContext = Depends(get_user_context),
    credits: CreditState = Depends(get_credit_state),
):
    try:
        answer = services.chat_completion(
            user.uid,
            user.plan,
            [message.model_dump() for message in body.messages],
            credits.as_tuple(),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Re-read: the turn we just answered spent credits.
    remaining = load_credit_state(user.uid, user.plan, user.stripe_customer_id)
    return schemas.ChatResponse(
        message=schemas.ChatMessage(role="assistant", content=answer),
        credits=schemas.CreditState.from_state(remaining),
    )
