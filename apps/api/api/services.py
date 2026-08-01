"""Service layer: the de-UI-ified logic from the legacy Streamlit pages
(callbacks.py, pages/app.py, pages/chat.py, utils_user.update_user_plan),
wired to the frozen backend package. See docs/PLAN.md sections 1.3 and 3."""

import math
import os
import tempfile
import threading
import time
from datetime import datetime

import nh3
import pandas as pd
import pytz

from backend import utils_firebase
from backend.credits import CreditsCalculator
from backend.run_pipeline import run_flow_for_user
from backend.twitter_scraper import verify_account_exists, scrape_accounts_followers
from config.plans_config import PLAN_PROPERTIES
from config.prompt_config import CHAT_CONTEXT_PROMPT, DEFAULT_X_PROMPT
from backend.ml_module.utils import truncate_prompt
from backend.ml_module.preprocessors import preprocess_X_data
from utils import get_logger, convert_utc_to_custome_timezone
from utils_user import get_user_subscription_info_from_stripe

logger = get_logger("main_logger")
credits_calculator = CreditsCalculator()

CHAT_MODEL = "gpt-5-mini"
GENERATION_STALE_LOCK_MINUTES = 30


# =====================================================================
# HTML sanitization
# =====================================================================

def sanitize_summary_html(html: str | None) -> str:
    """LLM-generated HTML goes through an allowlist sanitizer before it ever
    reaches a browser (the legacy app rendered it raw via st.html)."""
    if not html:
        return ""
    return nh3.clean(html)


# =====================================================================
# Plan sync (port of the legacy utils_user.update_user_plan)
# =====================================================================

def sync_plan_with_stripe(uid: str, email: str, current_plan: str) -> dict:
    """Lazily sync the Firestore plan with the live Stripe subscription,
    exactly like the legacy app did on every page load. Returns plan info."""
    info = {
        "plan": current_plan,
        "period": None,
        "status": None,
        "cancel_at_period_end": False,
        "current_period_start": None,
        "current_period_end": None,
    }

    if current_plan == "admin":
        return info

    try:
        sub_info = get_user_subscription_info_from_stripe(email)
    except Exception as e:
        logger.warning(f"Stripe subscription lookup failed for {email}: {e}")
        return info

    if sub_info is None:
        if current_plan != "free":
            utils_firebase.update_data_firestore_DB(uid, {"plan": "free"})
        info["plan"] = "free"
        return info

    plan_end_date = datetime.fromtimestamp(sub_info.get("current_period_end"), pytz.UTC)
    plan_cancel_at_end_date = sub_info.get("cancel_at_period_end", False)
    is_expired = datetime.now(pytz.UTC) >= plan_end_date and plan_cancel_at_end_date
    if is_expired:
        if current_plan != "free":
            utils_firebase.update_data_firestore_DB(uid, {"plan": "free"})
        info["plan"] = "free"
        return info

    subscription_plan = sub_info["plan"]["metadata"]["name"]
    subscription_plan = subscription_plan.split("_")[0].lower()
    if current_plan != subscription_plan:
        utils_firebase.update_data_firestore_DB(uid, {"plan": subscription_plan})

    info.update(
        {
            "plan": subscription_plan,
            "period": sub_info["plan"]["interval"],
            "status": sub_info["status"],
            "cancel_at_period_end": plan_cancel_at_end_date,
            "current_period_start": sub_info.get("current_period_start"),
            "current_period_end": sub_info.get("current_period_end"),
        }
    )
    return info


# =====================================================================
# Feed
# =====================================================================

_FEED_FIELDS = [
    "summary_data.summary_html",
    "summary_data.audio_url",
    "summary_data.last_generation_time",
    "summary_data.raw_data_sources",
    "settings_global.timezone",
]


def _feed_payload(data: dict, is_demo: bool) -> dict:
    tz = data.get("settings_global.timezone") or "America/New_York"
    gen_time = data.get("summary_data.last_generation_time") or ""
    local = (
        convert_utc_to_custome_timezone(gen_time, tz, show_timezone=True)
        if gen_time
        else ""
    )
    return {
        "is_demo": is_demo,
        "summary_html": sanitize_summary_html(data.get("summary_data.summary_html")),
        "audio_url": data.get("summary_data.audio_url") or "",
        "last_generation_time": gen_time,
        "last_generation_time_local": local if isinstance(local, str) else gen_time,
        "timezone": tz,
        "raw_data_sources": data.get("summary_data.raw_data_sources") or [],
    }


def get_feed(uid: str) -> dict:
    """The user's feed; falls back to the default_user demo summary when the
    user has never generated (parity with pages/app.py)."""
    data = utils_firebase.get_specific_user_data(uid, _FEED_FIELDS)
    if data and data.get("summary_data.summary_html"):
        return _feed_payload(data, is_demo=False)
    return get_demo_feed()


def get_demo_feed() -> dict:
    data = utils_firebase.get_specific_user_data("default_user", _FEED_FIELDS)
    if not data:
        return _feed_payload({}, is_demo=True)
    return _feed_payload(data, is_demo=True)


def get_source_data(uid: str) -> dict:
    """Download the raw scraped CSV behind the current summary and compute the
    aggregates the legacy Source Data tab showed (pages/app.py)."""
    data = utils_firebase.get_specific_user_data(
        uid, ["summary_data.raw_data_sources"]
    )
    sources = (data or {}).get("summary_data.raw_data_sources") or []
    csv_sources = [s for s in sources if s.endswith(".csv")]
    if not csv_sources:
        raise LookupError("No source data available for this user")

    with tempfile.TemporaryDirectory() as local_dir:
        local_path = os.path.join(local_dir, os.path.basename(csv_sources[0]))
        success, _ = utils_firebase.download_file_from_firebase_storage(
            csv_sources[0], local_path
        )
        if not success:
            raise LookupError("Failed to download source data")
        df = pd.read_csv(local_path)

    if "index" in df.columns:
        df = df.drop("index", axis=1)
    df["likeCount"] = pd.to_numeric(df["likeCount"], errors="coerce").fillna(0)
    df["viewCount"] = pd.to_numeric(df["viewCount"], errors="coerce").fillna(0)

    per_account_posts = df["userName"].value_counts()
    per_account_avg = df.groupby("userName")[["likeCount", "viewCount"]].mean()
    per_account = [
        {
            "account": str(name),
            "posts": int(per_account_posts.get(name, 0)),
            "avg_likes": round(float(per_account_avg.loc[name, "likeCount"]), 1),
            "avg_views": round(float(per_account_avg.loc[name, "viewCount"]), 1),
        }
        for name in per_account_posts.index
    ]

    timeline_counts = df.groupby("createdAt").size().sort_index()
    timeline = [
        {"time": str(t), "count": int(c)} for t, c in timeline_counts.items()
    ]

    rows_df = df.sort_values(by=["userName", "createdAt"], ascending=[True, False])
    rows_df = rows_df.astype(object).where(pd.notnull(rows_df), None)
    rows = rows_df.to_dict(orient="records")

    return {
        "total_posts": int(len(df)),
        "total_likes": int(df["likeCount"].sum()),
        "total_views": int(df["viewCount"].sum()),
        "per_account": per_account,
        "timeline": timeline,
        "rows": rows,
    }


# =====================================================================
# Generation (port of callbacks.py + pages/app.py generate_button checks)
# =====================================================================

_GEN_SETTINGS_FIELDS = [
    "settings_X.accounts",
    "settings_X.verified_accounts",
    "settings_global.ai_prompt",
    "settings_global.newsletter_email",
    "settings_global.timezone",
    "pipeline_status.status",
    "pipeline_status.start_time",
]


def _write_error_status(uid: str, message: str) -> None:
    progress_data = {
        "pipeline_status": {
            "current_stage": "starting",
            "status": "error",
            "error": message,
            "stages_completed": [],
            "start_time": datetime.now(pytz.timezone("UTC")).strftime(
                "%Y-%m-%d %H:%M:%S %Z(%z)"
            ),
            "end_time": None,
        }
    }
    utils_firebase.update_data_firestore_DB(uid, progress_data)


def compute_generation_cost(plan: str, fetch_latest: bool, skip_audio: bool = False) -> int:
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
    blockers = []
    if not accounts:
        blockers.append("no_accounts")
    elif not any(acc in (verified or []) for acc in accounts):
        blockers.append("no_verified_accounts")
    if credits_left < cost:
        blockers.append("insufficient_credits")
    return blockers


def generation_is_locked(status: str | None, start_time: str | None) -> bool:
    """True while a pipeline run is in progress and not stale (the legacy app
    had no lock at all; the stale window prevents a crashed run from blocking
    the user forever)."""
    if status != "in_progress":
        return False
    if not start_time:
        return True
    try:
        started = datetime.strptime(start_time.split(" UTC")[0], "%Y-%m-%d %H:%M:%S")
        started = pytz.utc.localize(started)
    except Exception:
        return True
    age_minutes = (datetime.now(pytz.UTC) - started).total_seconds() / 60
    return age_minutes < GENERATION_STALE_LOCK_MINUTES


def _run_generation(
    uid: str,
    email: str,
    accounts: list[str],
    plan: str,
    timezone_str: str,
    prompt: str,
    fetch_latest: bool,
    skip_audio: bool,
    skip_email: bool,
    newsletter_email: str,
    credits_usage: dict,
) -> None:
    """Thread target: the legacy generate_summary_callback minus the UI."""
    try:
        run_flow_for_user(
            uid=uid,
            email=email,
            followers=accounts,
            plan=plan,
            timezone=pytz.timezone(timezone_str),
            prompt=prompt,
            skip_scraping=not fetch_latest,
            skip_summary=False,
            skip_audio=skip_audio,
            skip_email=skip_email,
            newsletter_email=newsletter_email,
            credits_usage=credits_usage,
        )
        # Bump n_generations on success (parity with generate_summary_callback)
        status = utils_firebase.get_specific_user_data(
            uid, ["pipeline_status.status", f"plan_usage.{plan}.n_generations"]
        )
        if status and status.get("pipeline_status.status") == "success":
            n_generations = status.get(f"plan_usage.{plan}.n_generations") or 0
            utils_firebase.update_usage(
                uid, {"n_generations": n_generations + 1}, plan
            )
    except Exception as e:
        logger.error(f"Generation thread failed for {email}: {e}")
        _write_error_status(uid, f"Error generating content: {str(e)}")


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
    """Validate then spawn the pipeline thread. Raises ValueError with an error
    code string for client-mappable failures."""
    data = utils_firebase.get_specific_user_data(uid, _GEN_SETTINGS_FIELDS) or {}
    accounts = data.get("settings_X.accounts") or []
    verified = data.get("settings_X.verified_accounts") or []
    ai_prompt = data.get("settings_global.ai_prompt") or DEFAULT_X_PROMPT
    newsletter_email = data.get("settings_global.newsletter_email") or email
    timezone_str = data.get("settings_global.timezone") or "America/New_York"

    if generation_is_locked(
        data.get("pipeline_status.status"), data.get("pipeline_status.start_time")
    ):
        raise ValueError("generation_in_progress")

    if not accounts:
        # Parity with legacy callbacks.generate_content: surface via pipeline_status too
        _write_error_status(uid, "No accounts found in settings")
        raise ValueError("no_accounts")

    if not any(acc in verified for acc in accounts):
        raise ValueError("no_verified_accounts")

    monthly_left, prepaid_left, monthly_limit, prepaid_limit = credit_state
    cost = compute_generation_cost(plan, fetch_latest, skip_audio)
    if monthly_left + prepaid_left < cost:
        raise ValueError("insufficient_credits")

    credits_usage = {
        "monthly_credits_left": monthly_left,
        "prepaid_credits_left": prepaid_left,
        "monthly_credits_limit": monthly_limit,
        "prepaid_credits_limit": prepaid_limit,
    }

    # Make polling see in_progress immediately (run_flow re-initializes it too)
    utils_firebase.update_data_firestore_DB(
        uid,
        {
            "pipeline_status": {
                "current_stage": "starting",
                "status": "in_progress",
                "error": None,
                "stages_completed": [],
                "start_time": datetime.now(pytz.timezone("UTC")).strftime(
                    "%Y-%m-%d %H:%M:%S %Z(%z)"
                ),
                "end_time": None,
            }
        },
    )

    thread = threading.Thread(
        target=_run_generation,
        kwargs=dict(
            uid=uid,
            email=email,
            accounts=accounts,
            plan=plan,
            timezone_str=timezone_str,
            prompt=prompt or ai_prompt,
            fetch_latest=fetch_latest,
            skip_audio=skip_audio,
            skip_email=skip_email,
            newsletter_email=newsletter_email,
            credits_usage=credits_usage,
        ),
        daemon=True,
    )
    thread.start()


# =====================================================================
# Chat (port of pages/chat.py)
# =====================================================================

def _load_chat_context(uid: str) -> str:
    user_data = utils_firebase.get_specific_user_data(
        uid, ["summary_data.summary_html", "summary_data.raw_data_sources"]
    )
    summary_html = (user_data or {}).get("summary_data.summary_html") or ""
    data_sources = (user_data or {}).get("summary_data.raw_data_sources") or []
    if not data_sources:
        fb_X_raw_data_path = "users/default/latest/raw_scraped_tweets.csv"
    else:
        fb_X_raw_data_path = data_sources[0]

    with tempfile.TemporaryDirectory() as temp_dir:
        local_path = os.path.join(temp_dir, "raw_scraped_tweets.csv")
        success = utils_firebase.download_raw_X_data_from_firestore(
            fb_X_raw_data_path, local_path
        )
        if not success:
            raise LookupError("Failed to download feed data for chat context")
        raw_data = preprocess_X_data(local_path)

    raw_data = truncate_prompt(raw_data, model=CHAT_MODEL, max_context_length=128000)
    return f"{CHAT_CONTEXT_PROMPT} \n\n {raw_data} \n\n {summary_html}"


def chat_completion(
    uid: str, plan: str, messages: list[dict], credit_state: tuple[int, int, int, int]
) -> str:
    """One chat turn with feed context, with the same usage/cost/credit updates
    the legacy chat page performed per message."""
    from openai import OpenAI

    monthly_left, prepaid_left, monthly_limit, prepaid_limit = credit_state
    message_cost = credits_calculator.compute_chat_message_credits_per_message()
    if monthly_left + prepaid_left < message_cost:
        raise ValueError("insufficient_credits")

    context = _load_chat_context(uid)
    full_messages = [{"role": "developer", "content": context}] + [
        {"role": m["role"], "content": m["content"]} for m in messages
    ]

    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=full_messages,
        max_completion_tokens=1024 * 4,
        stream=False,
    )
    answer = response.choices[0].message.content or ""

    # Usage + cost tracking + credit deduction (parity with pages/chat.py)
    current = utils_firebase.get_specific_user_data(
        uid, [f"plan_usage.{plan}.n_chat_messages"]
    )
    n_chat_messages = (current or {}).get(f"plan_usage.{plan}.n_chat_messages") or 0
    utils_firebase.update_usage(uid, {"n_chat_messages": n_chat_messages + 1}, plan)

    usage = getattr(response, "usage", None)
    cost_tracker = {
        "models": {
            CHAT_MODEL: {
                "n_tokens_input": getattr(usage, "prompt_tokens", 0) or 0,
                "n_tokens_output": getattr(usage, "completion_tokens", 0) or 0,
                "n_calls": 1,
            }
        }
    }
    utils_firebase.update_cost_tracker(uid, cost_tracker)

    utils_firebase.update_credit_usage(
        uid,
        plan,
        message_cost,
        monthly_left,
        prepaid_left,
        monthly_limit,
        prepaid_limit,
    )

    return answer


# =====================================================================
# Accounts (port of pages/settings_x.py add/verify/import)
# =====================================================================

def normalize_handles(handles: list[str]) -> list[str]:
    """Normalize to @handle form, drop empties, dedupe preserving order."""
    seen = set()
    result = []
    for h in handles:
        h = (h or "").strip().lstrip("@").strip()
        if not h:
            continue
        h = f"@{h}"
        if h.lower() not in seen:
            seen.add(h.lower())
            result.append(h)
    return result


def add_accounts(uid: str, plan: str, handles: list[str]) -> dict:
    data = utils_firebase.get_specific_user_data(uid, ["settings_X.accounts"]) or {}
    accounts = data.get("settings_X.accounts") or []
    max_accounts = PLAN_PROPERTIES[plan]["limits"]["max_followers"]

    new_handles = [
        h for h in normalize_handles(handles)
        if h.lower() not in {a.lower() for a in accounts}
    ]
    room = max(0, max_accounts - len(accounts))
    accepted = new_handles[:room]
    skipped = len(new_handles) - len(accepted)

    if accepted:
        accounts = accounts + accepted
        utils_firebase.update_data_firestore_DB(
            uid, {"settings_X.accounts": accounts}
        )
    return {"accounts": accounts, "added": accepted, "skipped_due_to_limit": skipped}


def remove_account(uid: str, handle: str) -> list[str]:
    data = utils_firebase.get_specific_user_data(
        uid, ["settings_X.accounts", "settings_X.verified_accounts"]
    ) or {}
    accounts = data.get("settings_X.accounts") or []
    verified = data.get("settings_X.verified_accounts") or []
    handle_norm = f"@{handle.lstrip('@')}".lower()
    accounts = [a for a in accounts if a.lower() != handle_norm]
    verified = [a for a in verified if a.lower() != handle_norm]
    utils_firebase.update_data_firestore_DB(
        uid,
        {
            "settings_X.accounts": accounts,
            "settings_X.verified_accounts": verified,
        },
    )
    return accounts


def verify_accounts(uid: str) -> dict:
    """Verify unverified accounts via Apify (parity with settings_x.verify_accounts)."""
    data = utils_firebase.get_specific_user_data(
        uid, ["settings_X.accounts", "settings_X.verified_accounts"]
    ) or {}
    accounts = data.get("settings_X.accounts") or []
    verified = data.get("settings_X.verified_accounts") or []

    to_verify = [a for a in accounts if a not in verified]
    if not to_verify:
        return {"verified_accounts": verified, "not_found": []}

    not_found = verify_account_exists(to_verify)
    newly_verified = [a for a in to_verify if a not in not_found]
    verified = verified + [a for a in newly_verified if a not in verified]

    utils_firebase.update_data_firestore_DB(
        uid, {"settings_X.verified_accounts": verified}
    )
    return {"verified_accounts": verified, "not_found": not_found}


def import_followees(uid: str, plan: str, source: str) -> dict:
    """Import the accounts a given X account follows (settings fetch_and_add_accounts)."""
    source = f"@{source.strip().lstrip('@')}"
    followees = scrape_accounts_followers(source, max_followers=1000)
    followees = [f"@{f.lstrip('@')}" for f in followees if f]

    result = add_accounts(uid, plan, followees)

    # usage tracking (n_followers_scraped), parity with the legacy import flow
    current = utils_firebase.get_specific_user_data(
        uid, [f"plan_usage.{plan}.n_followers_scraped"]
    )
    n_scraped = (current or {}).get(f"plan_usage.{plan}.n_followers_scraped") or 0
    utils_firebase.update_usage(
        uid, {"n_followers_scraped": n_scraped + len(followees)}, plan
    )

    return {
        "imported": result["added"],
        "accounts": result["accounts"],
        "skipped_due_to_limit": result["skipped_due_to_limit"],
    }
