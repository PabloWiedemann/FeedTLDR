"""One chat turn against the user's feed (port of pages/chat.py)."""

import os
import tempfile

from openai import OpenAI

from api.constants import (
    CHAT_MAX_CONTEXT_TOKENS,
    CHAT_MAX_OUTPUT_TOKENS,
    CHAT_MODEL,
    ERROR_INSUFFICIENT_CREDITS,
    FIELD_RAW_DATA_SOURCES,
    FIELD_SUMMARY_HTML,
)
from backend import utils_firebase
from backend.credits import CreditsCalculator
from backend.ml_module.preprocessors import preprocess_X_data
from backend.ml_module.utils import truncate_prompt
from config.prompt_config import CHAT_CONTEXT_PROMPT

credits_calculator = CreditsCalculator()

# Users who have never generated still get a chat, backed by the demo scrape.
_DEMO_SCRAPE_PATH = "users/default/latest/raw_scraped_tweets.csv"


def _load_posts(scrape_path: str) -> str:
    with tempfile.TemporaryDirectory() as temp_dir:
        local_path = os.path.join(temp_dir, "raw_scraped_tweets.csv")
        if not utils_firebase.download_raw_X_data_from_firestore(
            scrape_path, local_path
        ):
            raise LookupError("Failed to download feed data for chat context")
        posts = preprocess_X_data(local_path)

    return truncate_prompt(
        posts, model=CHAT_MODEL, max_context_length=CHAT_MAX_CONTEXT_TOKENS
    )


def _load_context(uid: str, include_posts: bool, include_summary: bool) -> str:
    """The model sees the raw posts and the rendered summary, in that order.

    The user can drop either part from the composer's context cards; a
    dropped part is never fetched.
    """
    fields = []
    if include_summary:
        fields.append(FIELD_SUMMARY_HTML)
    if include_posts:
        fields.append(FIELD_RAW_DATA_SOURCES)
    user_data = (
        utils_firebase.get_specific_user_data(uid, fields) or {} if fields else {}
    )

    parts = [CHAT_CONTEXT_PROMPT]
    if include_posts:
        sources = user_data.get(FIELD_RAW_DATA_SOURCES) or []
        parts.append(_load_posts(sources[0] if sources else _DEMO_SCRAPE_PATH))
    if include_summary:
        parts.append(user_data.get(FIELD_SUMMARY_HTML) or "")
    return " \n\n ".join(parts)


def _record_usage(uid: str, plan: str, response) -> None:
    """Record the completed message and model usage after credits reserve."""
    current = utils_firebase.get_specific_user_data(
        uid, [f"plan_usage.{plan}.n_chat_messages"]
    )
    sent = (current or {}).get(f"plan_usage.{plan}.n_chat_messages") or 0
    utils_firebase.update_usage(uid, {"n_chat_messages": sent + 1}, plan)

    usage = getattr(response, "usage", None)
    utils_firebase.update_cost_tracker(
        uid,
        {
            "models": {
                CHAT_MODEL: {
                    "n_tokens_input": getattr(usage, "prompt_tokens", 0) or 0,
                    "n_tokens_output": getattr(usage, "completion_tokens", 0) or 0,
                    "n_calls": 1,
                }
            }
        },
    )


def chat_completion(
    uid: str,
    plan: str,
    messages: list[dict],
    credit_state: tuple[int, int, int, int],
    include_posts: bool = True,
    include_summary: bool = True,
) -> str:
    """Answer one question about the user's feed, charging a credit for it."""
    monthly_left, prepaid_left, monthly_limit, prepaid_limit = credit_state
    cost = credits_calculator.compute_chat_message_credits_per_message()
    if monthly_left + prepaid_left < cost:
        raise ValueError(ERROR_INSUFFICIENT_CREDITS)

    utils_firebase.reserve_credit_usage(uid, plan, cost, monthly_limit, prepaid_limit)

    conversation = [
        {
            "role": "developer",
            "content": _load_context(uid, include_posts, include_summary),
        }
    ] + [
        {"role": message["role"], "content": message["content"]} for message in messages
    ]

    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=conversation,
        max_completion_tokens=CHAT_MAX_OUTPUT_TOKENS,
        stream=False,
    )

    _record_usage(uid, plan, response)
    return response.choices[0].message.content or ""
