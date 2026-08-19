"""Business logic for the v1 API, one module per domain.

Services never import FastAPI. They raise `ValueError` carrying an error code
from `api.constants` for failures the client can act on, and `LookupError`
when data is missing; routers own the HTTP mapping.
"""

from api.services.accounts import (
    add_accounts,
    import_followees,
    normalize_handle,
    normalize_handles,
    clear_accounts,
    remove_account,
    verify_accounts,
)
from api.services.chat import chat_completion
from api.services.feed import get_demo_feed, get_feed, get_source_data
from api.services.generation import (
    compute_generation_cost,
    generation_blockers,
    generation_is_locked,
    start_generation,
)
from api.services.plans import sync_plan_with_stripe
from api.services.sanitize import sanitize_summary_html

__all__ = [
    "add_accounts",
    "chat_completion",
    "compute_generation_cost",
    "generation_blockers",
    "generation_is_locked",
    "get_demo_feed",
    "get_feed",
    "get_source_data",
    "import_followees",
    "normalize_handle",
    "normalize_handles",
    "clear_accounts",
    "remove_account",
    "sanitize_summary_html",
    "start_generation",
    "sync_plan_with_stripe",
    "verify_accounts",
]
