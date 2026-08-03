"""FastAPI entrypoint. Run with: uv run uvicorn api.main:app --reload"""

import os

from dotenv import load_dotenv

load_dotenv()

# Firebase credentials resolve relative to PROJECT_DIR (legacy convention);
# default it to apps/api so the server starts correctly from any cwd.
_API_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("PROJECT_DIR", _API_ROOT)

import threading  # noqa: E402
import time  # noqa: E402
from contextlib import asynccontextmanager  # noqa: E402

import stripe  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from api.routers import auth, billing, chat, feed, generations, me, settings  # noqa: E402
from backend import utils_firebase  # noqa: E402
from utils import get_logger  # noqa: E402

logger = get_logger("main_logger")

LOCAL_WEB_ORIGIN = "http://localhost:3000"
# The standalone worker staggers its two loops by this much; matched here so
# in-process mode behaves identically.
WORKER_STARTUP_STAGGER_SECONDS = 10


def _configure_stripe() -> None:
    """STRIPE_ENV picks which key pair is live: STRIPE_API_KEY_TEST or _LIVE."""
    stripe_env = os.getenv("STRIPE_ENV")
    if stripe_env:
        stripe.api_key = os.environ.get(f"STRIPE_API_KEY_{stripe_env.upper()}")


def _allowed_origins() -> list[str]:
    """WEB_ORIGIN accepts a comma-separated list, e.g.
    "https://feedtldr.com,https://www.feedtldr.com"."""
    configured = os.environ.get("WEB_ORIGIN", LOCAL_WEB_ORIGIN).split(",")
    origins = [origin.strip() for origin in configured if origin.strip()]
    return [*origins, LOCAL_WEB_ORIGIN]


def _start_newsletter_daemon() -> None:
    """Cost-saving single-service mode: RUN_WORKER=1 runs the newsletter daemon
    inside the API process instead of a separate Render worker service.

    Trade-off: an API deploy interrupts an in-flight newsletter run (it is
    retried on the daemon's next hourly pass). Unset to run them separately.
    """
    try:
        from worker import daemon as newsletter_daemon

        threading.Thread(
            target=newsletter_daemon.check_and_add_users, daemon=True
        ).start()
        time.sleep(WORKER_STARTUP_STAGGER_SECONDS)
        threading.Thread(target=newsletter_daemon.process_users, daemon=True).start()
        logger.info("✅ Newsletter daemon running inside API (RUN_WORKER=1)")
    except Exception as e:
        logger.error(f"Failed to start newsletter daemon: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        utils_firebase.initialize_firebase_client()
        logger.info("✅ Firebase initialized")
    except Exception as e:
        logger.warning(
            f"Firebase not initialized at startup ({e}); "
            "endpoints needing it will return 503 until credentials are in place"
        )

    if os.environ.get("RUN_WORKER") == "1":
        threading.Thread(target=_start_newsletter_daemon, daemon=True).start()

    yield


_configure_stripe()

app = FastAPI(
    title="FeedTLDR API",
    version="1.0.0",
    description=(
        "API wrapping the FeedTLDR pipeline (scrape, summarize, narrate, email). "
        "Authenticated endpoints expect a Firebase ID token as a Bearer token."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", tags=["health"])
def healthz() -> dict:
    return {"status": "ok"}


for router in (auth, me, settings, feed, generations, chat, billing):
    app.include_router(router.router)
