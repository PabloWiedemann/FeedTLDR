"""The X accounts a user follows (port of pages/settings_x.py)."""

from api.constants import (
    FIELD_ACCOUNTS,
    FIELD_VERIFIED_ACCOUNTS,
    MAX_IMPORTED_FOLLOWEES,
)
from backend import utils_firebase
from backend.twitter_scraper import scrape_accounts_followers, verify_account_exists
from config.plans_config import PLAN_PROPERTIES


def normalize_handle(handle: str) -> str:
    """Handles are stored and compared in a single "@name" form."""
    return f"@{(handle or '').strip().lstrip('@').strip()}"


def normalize_handles(handles: list[str]) -> list[str]:
    """Normalize to @handle form, drop empties, dedupe preserving order."""
    seen: set[str] = set()
    normalized = []
    for handle in handles:
        candidate = normalize_handle(handle)
        if candidate == "@" or candidate.lower() in seen:
            continue
        seen.add(candidate.lower())
        normalized.append(candidate)
    return normalized


def _load(uid: str) -> tuple[list[str], list[str]]:
    data = (
        utils_firebase.get_specific_user_data(
            uid, [FIELD_ACCOUNTS, FIELD_VERIFIED_ACCOUNTS]
        )
        or {}
    )
    return (
        data.get(FIELD_ACCOUNTS) or [],
        data.get(FIELD_VERIFIED_ACCOUNTS) or [],
    )


def add_accounts(uid: str, plan: str, handles: list[str]) -> dict:
    """Add handles up to the plan's limit, reporting what did not fit."""
    accounts, _ = _load(uid)
    known = {account.lower() for account in accounts}
    candidates = [h for h in normalize_handles(handles) if h.lower() not in known]

    room = max(0, PLAN_PROPERTIES[plan]["limits"]["max_followers"] - len(accounts))
    accepted = candidates[:room]

    if accepted:
        accounts = accounts + accepted
        utils_firebase.update_data_firestore_DB(uid, {FIELD_ACCOUNTS: accounts})

    return {
        "accounts": accounts,
        "added": accepted,
        "skipped_due_to_limit": len(candidates) - len(accepted),
    }


def remove_account(uid: str, handle: str) -> list[str]:
    accounts, verified = _load(uid)
    removed = normalize_handle(handle).lower()
    accounts = [a for a in accounts if a.lower() != removed]
    verified = [a for a in verified if a.lower() != removed]
    utils_firebase.update_data_firestore_DB(
        uid, {FIELD_ACCOUNTS: accounts, FIELD_VERIFIED_ACCOUNTS: verified}
    )
    return accounts


def verify_accounts(uid: str) -> dict:
    """Check the not-yet-verified handles against X via Apify."""
    accounts, verified = _load(uid)
    pending = [account for account in accounts if account not in verified]
    if not pending:
        return {"verified_accounts": verified, "not_found": []}

    not_found = verify_account_exists(pending)
    verified = verified + [a for a in pending if a not in not_found]

    utils_firebase.update_data_firestore_DB(
        uid, {FIELD_VERIFIED_ACCOUNTS: verified}
    )
    return {"verified_accounts": verified, "not_found": not_found}


def import_followees(uid: str, plan: str, source: str) -> dict:
    """Add every account a given X account follows (fetch_and_add_accounts)."""
    followees = scrape_accounts_followers(
        normalize_handle(source), max_followers=MAX_IMPORTED_FOLLOWEES
    )
    followees = normalize_handles(followees)
    result = add_accounts(uid, plan, followees)

    current = utils_firebase.get_specific_user_data(
        uid, [f"plan_usage.{plan}.n_followers_scraped"]
    )
    scraped = (current or {}).get(f"plan_usage.{plan}.n_followers_scraped") or 0
    utils_firebase.update_usage(
        uid, {"n_followers_scraped": scraped + len(followees)}, plan
    )

    return {
        "imported": result["added"],
        "accounts": result["accounts"],
        "skipped_due_to_limit": result["skipped_due_to_limit"],
    }
