"""FastAPI entrypoint. Run with: uv run uvicorn api.main:app --reload"""

import os

from dotenv import load_dotenv

load_dotenv()

# Firebase credentials resolve relative to PROJECT_DIR (legacy convention);
# default it to apps/api so the server starts correctly from any cwd.
_API_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("PROJECT_DIR", _API_ROOT)

import stripe  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from api.routers import auth, billing, chat, feed, generations, me, settings  # noqa: E402
from backend import utils_firebase  # noqa: E402
from utils import get_logger  # noqa: E402

logger = get_logger("main_logger")

_stripe_env = os.getenv("STRIPE_ENV")
if _stripe_env:
    stripe.api_key = os.environ.get(f"STRIPE_API_KEY_{_stripe_env.upper()}")

app = FastAPI(
    title="FeedTLDR API",
    version="1.0.0",
    description=(
        "API wrapping the FeedTLDR pipeline (scrape, summarize, narrate, email). "
        "Authenticated endpoints expect a Firebase ID token as a Bearer token."
    ),
)

_web_origin = os.environ.get("WEB_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_web_origin, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    try:
        utils_firebase.initialize_firebase_client()
        logger.info("✅ Firebase initialized")
    except Exception as e:
        logger.warning(
            f"Firebase not initialized at startup ({e}); "
            "endpoints needing it will return 503 until credentials are in place"
        )


@app.get("/healthz", tags=["health"])
def healthz() -> dict:
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(me.router)
app.include_router(settings.router)
app.include_router(feed.router)
app.include_router(generations.router)
app.include_router(chat.router)
app.include_router(billing.router)
