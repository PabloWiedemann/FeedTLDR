"""Unit tests for the pure parts of api/services: the decisions that gate a
generation, normalize user input, and shape the feed payload. No network, no
Firestore, no credentials."""

import pytest

from api.constants import (
    DEFAULT_TIMEZONE,
    ERROR_INSUFFICIENT_CREDITS,
    ERROR_NO_ACCOUNTS,
    ERROR_NO_VERIFIED_ACCOUNTS,
    GENERATION_STALE_LOCK_MINUTES,
)
from api.deps import CreditState, known_plan
from api.services.accounts import normalize_handle, normalize_handles
from api.services.feed import _feed_payload
from api.services.generation import generation_blockers, generation_is_locked
from api.services.plans import _plan_name, _subscription_has_lapsed


# ---------- generation gating ----------

def test_no_accounts_is_the_only_blocker_reported_for_an_empty_list():
    assert generation_blockers([], [], credits_left=100, cost=10) == [
        ERROR_NO_ACCOUNTS
    ]


def test_unverified_accounts_block_generation():
    assert generation_blockers(["@a"], [], credits_left=100, cost=10) == [
        ERROR_NO_VERIFIED_ACCOUNTS
    ]


def test_one_verified_account_is_enough():
    assert generation_blockers(["@a", "@b"], ["@b"], credits_left=100, cost=10) == []


def test_exact_credit_balance_is_enough():
    assert generation_blockers(["@a"], ["@a"], credits_left=10, cost=10) == []
    assert generation_blockers(["@a"], ["@a"], credits_left=9, cost=10) == [
        ERROR_INSUFFICIENT_CREDITS
    ]


def test_account_and_credit_blockers_are_reported_together():
    assert generation_blockers([], [], credits_left=0, cost=10) == [
        ERROR_NO_ACCOUNTS,
        ERROR_INSUFFICIENT_CREDITS,
    ]


# ---------- generation lock ----------

@pytest.mark.parametrize("state", ["success", "error", "", None])
def test_only_in_progress_runs_can_lock(state):
    assert generation_is_locked(state, "2020-01-01 00:00:00 UTC(+0000)") is False


def test_a_run_with_an_unreadable_start_time_counts_as_running():
    assert generation_is_locked("in_progress", "not a timestamp") is True
    assert generation_is_locked("in_progress", None) is True


def test_a_stale_run_stops_locking():
    from datetime import datetime, timedelta

    import pytz

    started = datetime.now(pytz.UTC) - timedelta(
        minutes=GENERATION_STALE_LOCK_MINUTES + 1
    )
    stamp = started.strftime("%Y-%m-%d %H:%M:%S UTC(+0000)")
    assert generation_is_locked("in_progress", stamp) is False


def test_a_fresh_run_still_locks():
    from datetime import datetime

    import pytz

    stamp = datetime.now(pytz.UTC).strftime("%Y-%m-%d %H:%M:%S UTC(+0000)")
    assert generation_is_locked("in_progress", stamp) is True


# ---------- handles ----------

def test_normalize_handle_accepts_every_form_a_user_types():
    assert normalize_handle("  @Karpathy ") == "@Karpathy"
    assert normalize_handle("karpathy") == "@karpathy"


def test_normalize_handles_dedupes_case_insensitively_and_keeps_order():
    assert normalize_handles(["@b", "  a", "@A", "", "  ", "@b"]) == ["@b", "@a"]


# ---------- feed payload ----------

def test_feed_payload_falls_back_to_the_default_timezone():
    payload = _feed_payload({}, is_demo=True)
    assert payload["timezone"] == DEFAULT_TIMEZONE
    assert payload["is_demo"] is True
    assert payload["summary_html"] == ""
    assert payload["raw_data_sources"] == []


def test_feed_payload_sanitizes_the_summary():
    payload = _feed_payload(
        {"summary_data.summary_html": "<p>Hi</p><script>alert(1)</script>"},
        is_demo=False,
    )
    assert "<script>" not in payload["summary_html"]
    assert "Hi" in payload["summary_html"]


# ---------- plans ----------

def test_plan_name_reads_the_stripe_metadata_convention():
    assert _plan_name({"plan": {"metadata": {"name": "PRO_MONTHLY"}}}) == "pro"


def test_a_subscription_only_lapses_once_its_cancelled_period_ends():
    future = {"cancel_at_period_end": True, "current_period_end": 4_102_444_800}
    past = {"cancel_at_period_end": True, "current_period_end": 946_684_800}
    assert _subscription_has_lapsed(future) is False
    assert _subscription_has_lapsed(past) is True
    assert _subscription_has_lapsed({"current_period_end": 946_684_800}) is False


# ---------- request context ----------

def test_unknown_plans_degrade_to_free():
    assert known_plan("pro") == "pro"
    assert known_plan("enterprise") == "free"
    assert known_plan(None) == "free"


def test_credit_state_totals_and_tuple_order():
    credits = CreditState(
        monthly_left=3, prepaid_left=4, monthly_limit=10, prepaid_limit=20
    )
    assert credits.total_left == 7
    assert credits.as_tuple() == (3, 4, 10, 20)
