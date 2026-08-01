from fastapi import APIRouter, Depends, HTTPException

from api import schemas, services
from api.deps import AuthUser, get_current_user, load_credit_state
from backend import utils_firebase

router = APIRouter(prefix="/v1/chat", tags=["chat"])


@router.post("", response_model=schemas.ChatResponse)
def chat(body: schemas.ChatRequest, user: AuthUser = Depends(get_current_user)):
    data = utils_firebase.get_specific_user_data(user.uid, ["plan", "stripe_customer_id"])
    if data is None:
        raise HTTPException(status_code=404, detail="User not registered")
    plan = data.get("plan") or "free"

    credit_state = load_credit_state(user.uid, plan, data.get("stripe_customer_id"))
    try:
        answer = services.chat_completion(
            user.uid,
            plan,
            [m.model_dump() for m in body.messages],
            credit_state,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))

    monthly_left, prepaid_left, monthly_limit, prepaid_limit = load_credit_state(
        user.uid, plan, data.get("stripe_customer_id")
    )
    return schemas.ChatResponse(
        message=schemas.ChatMessage(role="assistant", content=answer),
        credits=schemas.CreditState(
            monthly_left=monthly_left,
            prepaid_left=prepaid_left,
            monthly_limit=monthly_limit,
            prepaid_limit=prepaid_limit,
        ),
    )
