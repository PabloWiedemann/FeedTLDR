"""Starting and gating a pipeline run (port of callbacks.py plus the
pages/app.py generate_button checks)."""

import math
import threading
from datetime import datetime

import pytz

from api.constants import (
    DEFAULT_TIMEZONE,
    ERROR_GENERATION_IN_PROGRESS,
    ERROR_INSUFFICIENT_CREDITS,
    ERROR_NO_ACCOUNTS,
    ERROR_NO_VERIFIED_ACCOUNTS,
    FIELD_ACCOUNTS,
    FIELD_AI_PROMPT,
    FIELD_NEWSLETTER_EMAIL,
    FIELD_PIPELINE_START,
    FIELD_PIPELINE_STATE,
    FIELD_PIPELINE_STATUS,
    FIELD_TIMEZONE,
    FIELD_VERIFIED_ACCOUNTS,
    GENERATION_STALE_LOCK_MINUTES,
    UTC_TIMESTAMP_FORMAT,
    UTC_TIMESTAMP_PARSE_FORMAT,
)
from backend import utils_firebase
from backend.credits import CreditsCalculator
from backend.run_pipeline import run_flow_for_user
from config.prompt_config import DEFAULT_X_PROMPT
from utils import get_logger

logger = get_logger("main_logger")
credits_calculator = CreditsCalculator()

_SETTINGS_FIELDS = [
    FIELD_ACCOUNTS,
    FIELD_VERIFIED_ACCOUNTS,
    FIELD_AI_PROMPT,
    FIELD_NEWSLETTER_EMAIL,
    FIELD_TIMEZONE,
    FIELD_PIPELINE_STATE,
    FIELD_PIPELINE_START,
]


def _utc_now_stamp() -> str:
    return datetime.now(pytz.UTC).strftime(UTC_TIMESTAMP_FORMAT)


def _pipeline_status(state: str, error: str | None = None) -> dict:
    """The shape the frozen pipeline writes, so the UI polls one format."""
    return {
        FIELD_PIPELINE_STATUS: {
            "current_stage": "starting",
            "status": state,
            "error": error,
            "stages_completed": [],
            "start_time": _utc_now_stamp(),
            "end_time": None,
        }
    }


def compute_generation_cost(
    plan: str, fetch_latest: bool, skip_audio: bool = False
) -> int:
    """Mirror of the legacy generate_button cost math."""
    cost = credits_calculator.compute_summary_generation_credits_per_run()
    if fetch_latest:
        cost += credits_calculator.compute_posts_scraping_credits(plan)
    if not skip_audio:
        cost += credits_calculator.compute_audiogeneration_credits_per_run()
    return math.ceil(cost)


def generation_blockers(
    accounts: list[str], verified: list[str], credits_left: int, cost: int
) -> list[str]:
    """Everything standing between the user and a new summary, in the order
    they would fix it."""
    blockers = []
    if not accounts:
        blockers.append(ERROR_NO_ACCOUNTS)
    elif not any(account in (verified or []) for account in accounts):
        blockers.append(ERROR_NO_VERIFIED_ACCOUNTS)
    if credits_left < cost:
        blockers.append(ERROR_INSUFFICIENT_CREDITS)
    return blockers


def generation_is_locked(state: str | None, start_time: str | None) -> bool:
    """True while a run is in progress and recent enough to still be alive.
    An unreadable or missing start time counts as running, so a broken stamp
    never lets two pipelines race."""
    if state != "in_progress":
        return False
    if not start_time:
        return True
    try:
        started = pytz.utc.localize(
            datetime.strptime(start_time.split(" UTC")[0], UTC_TIMESTAMP_PARSE_FORMAT)
        )
    except ValueError:
        return True
    age_minutes = (datetime.now(pytz.UTC) - started).total_seconds() / 60
    return age_minutes < GENERATION_STALE_LOCK_MINUTES


def _record_successful_generation(uid: str, plan: str) -> None:
    """Bump n_generations only when the pipeline actually finished (parity
    with generate_summary_callback)."""
    status = utils_firebase.get_specific_user_data(
        uid, [FIELD_PIPELINE_STATE, f"plan_usage.{plan}.n_generations"]
    )
    if not status or status.get(FIELD_PIPELINE_STATE) != "success":
        return
    completed = status.get(f"plan_usage.{plan}.n_generations") or 0
    utils_firebase.update_usage(uid, {"n_generations": completed + 1}, plan)


def _run_pipeline(uid: str, email: str, **kwargs) -> None:
    """Thread target: the legacy generate_summary_callback minus the UI."""
    plan = kwargs["plan"]
    try:
        run_flow_for_user(uid=uid, email=email, **kwargs)
        _record_successful_generation(uid, plan)
    except Exception as e:
        logger.error(f"Generation thread failed for {email}: {e}")
        utils_firebase.update_data_firestore_DB(
            uid, _pipeline_status("error", f"Error generating content: {e}")
        )


def start_generation(
    uid: str,
    email: str,
    plan: str,
    fetch_latest: bool,
    prompt: str | None,
    skip_audio: bool,
    skip_email: bool,
    credit_state: tuple[int, int, int, int],
) -> None:
    """Validate, then run the pipeline in a background thread.

    Raises ValueError carrying an error code from api.constants for every
    failure the client can act on.
    """
    settings = utils_firebase.get_specific_user_data(uid, _SETTINGS_FIELDS) or {}
    accounts = settings.get(FIELD_ACCOUNTS) or []
    verified = settings.get(FIELD_VERIFIED_ACCOUNTS) or []

    if generation_is_locked(
        settings.get(FIELD_PIPELINE_STATE), settings.get(FIELD_PIPELINE_START)
    ):
        raise ValueError(ERROR_GENERATION_IN_PROGRESS)

    if not accounts:
        # Parity with legacy callbacks.generate_content: the empty-accounts
        # case is also surfaced through pipeline_status, not just the response.
        utils_firebase.update_data_firestore_DB(
            uid, _pipeline_status("error", "No accounts found in settings")
        )
        raise ValueError(ERROR_NO_ACCOUNTS)

    if not any(account in verified for account in accounts):
        raise ValueError(ERROR_NO_VERIFIED_ACCOUNTS)

    monthly_left, prepaid_left, monthly_limit, prepaid_limit = credit_state
    cost = compute_generation_cost(plan, fetch_latest, skip_audio)
    if monthly_left + prepaid_left < cost:
        raise ValueError(ERROR_INSUFFICIENT_CREDITS)

    # Reserve before the worker starts so simultaneous requests cannot spend
    # the same balance. The transaction is the authority for this check.
    utils_firebase.reserve_credit_usage(uid, plan, cost, monthly_limit, prepaid_limit)

    # Make polling see in_progress immediately (run_flow re-initializes it too).
    utils_firebase.update_data_firestore_DB(uid, _pipeline_status("in_progress"))

    threading.Thread(
        target=_run_pipeline,
        kwargs=dict(
            uid=uid,
            email=email,
            followers=accounts,
            plan=plan,
            timezone=pytz.timezone(settings.get(FIELD_TIMEZONE) or DEFAULT_TIMEZONE),
            prompt=prompt or settings.get(FIELD_AI_PROMPT) or DEFAULT_X_PROMPT,
            skip_scraping=not fetch_latest,
            skip_summary=False,
            skip_audio=skip_audio,
            skip_email=skip_email,
            newsletter_email=settings.get(FIELD_NEWSLETTER_EMAIL) or email,
            # Credits were reserved atomically before the thread started.
            credits_usage=None,
        ),
        daemon=True,
    ).start()
