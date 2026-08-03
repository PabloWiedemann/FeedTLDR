"""The user's summary and the raw posts behind it."""

import os
import tempfile

import pandas as pd

from api.constants import (
    DEFAULT_TIMEZONE,
    DEMO_USER_ID,
    FIELD_AUDIO_URL,
    FIELD_LAST_GENERATION_TIME,
    FIELD_RAW_DATA_SOURCES,
    FIELD_SUMMARY_HTML,
    FIELD_TIMEZONE,
)
from api.services.sanitize import sanitize_summary_html
from backend import utils_firebase
from utils import convert_utc_to_custome_timezone

_FEED_FIELDS = [
    FIELD_SUMMARY_HTML,
    FIELD_AUDIO_URL,
    FIELD_LAST_GENERATION_TIME,
    FIELD_RAW_DATA_SOURCES,
    FIELD_TIMEZONE,
]

_ENGAGEMENT_COLUMNS = ["likeCount", "viewCount"]


def _feed_payload(data: dict, is_demo: bool) -> dict:
    timezone = data.get(FIELD_TIMEZONE) or DEFAULT_TIMEZONE
    generated_at = data.get(FIELD_LAST_GENERATION_TIME) or ""
    local = (
        convert_utc_to_custome_timezone(generated_at, timezone, show_timezone=True)
        if generated_at
        else ""
    )
    return {
        "is_demo": is_demo,
        "summary_html": sanitize_summary_html(data.get(FIELD_SUMMARY_HTML)),
        "audio_url": data.get(FIELD_AUDIO_URL) or "",
        "last_generation_time": generated_at,
        "last_generation_time_local": local if isinstance(local, str) else generated_at,
        "timezone": timezone,
        "raw_data_sources": data.get(FIELD_RAW_DATA_SOURCES) or [],
    }


def get_feed(uid: str) -> dict:
    """The user's feed; falls back to the demo summary when they have never
    generated one (parity with pages/app.py)."""
    data = utils_firebase.get_specific_user_data(uid, _FEED_FIELDS)
    if data and data.get(FIELD_SUMMARY_HTML):
        return _feed_payload(data, is_demo=False)
    return get_demo_feed()


def get_demo_feed() -> dict:
    data = utils_firebase.get_specific_user_data(DEMO_USER_ID, _FEED_FIELDS)
    return _feed_payload(data or {}, is_demo=True)


def _download_source_csv(uid: str) -> pd.DataFrame:
    data = utils_firebase.get_specific_user_data(uid, [FIELD_RAW_DATA_SOURCES])
    sources = (data or {}).get(FIELD_RAW_DATA_SOURCES) or []
    csv_sources = [source for source in sources if source.endswith(".csv")]
    if not csv_sources:
        raise LookupError("No source data available for this user")

    with tempfile.TemporaryDirectory() as local_dir:
        local_path = os.path.join(local_dir, os.path.basename(csv_sources[0]))
        success, _ = utils_firebase.download_file_from_firebase_storage(
            csv_sources[0], local_path
        )
        if not success:
            raise LookupError("Failed to download source data")
        return pd.read_csv(local_path)


def _numeric(posts: pd.DataFrame) -> pd.DataFrame:
    """Scraped engagement counts arrive as strings and sometimes blank."""
    for column in _ENGAGEMENT_COLUMNS:
        posts[column] = pd.to_numeric(posts[column], errors="coerce").fillna(0)
    return posts


def _per_account_stats(posts: pd.DataFrame) -> list[dict]:
    post_counts = posts["userName"].value_counts()
    averages = posts.groupby("userName")[_ENGAGEMENT_COLUMNS].mean()
    return [
        {
            "account": str(account),
            "posts": int(post_counts.get(account, 0)),
            "avg_likes": round(float(averages.loc[account, "likeCount"]), 1),
            "avg_views": round(float(averages.loc[account, "viewCount"]), 1),
        }
        for account in post_counts.index
    ]


def _timeline(posts: pd.DataFrame) -> list[dict]:
    counts = posts.groupby("createdAt").size().sort_index()
    return [{"time": str(at), "count": int(count)} for at, count in counts.items()]


def _rows(posts: pd.DataFrame) -> list[dict]:
    ordered = posts.sort_values(
        by=["userName", "createdAt"], ascending=[True, False]
    )
    # NaN is not JSON-serializable; the client renders missing cells as blank.
    return ordered.astype(object).where(pd.notnull(ordered), None).to_dict(
        orient="records"
    )


def get_source_data(uid: str) -> dict:
    """The scraped posts behind the current summary, plus the aggregates the
    legacy Source Data tab showed (pages/app.py)."""
    posts = _download_source_csv(uid)
    if "index" in posts.columns:
        posts = posts.drop("index", axis=1)
    posts = _numeric(posts)

    return {
        "total_posts": int(len(posts)),
        "total_likes": int(posts["likeCount"].sum()),
        "total_views": int(posts["viewCount"].sum()),
        "per_account": _per_account_stats(posts),
        "timeline": _timeline(posts),
        "rows": _rows(posts),
    }
