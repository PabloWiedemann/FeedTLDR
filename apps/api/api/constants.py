"""Literals shared across the API layer.

Anything that appears in more than one module — a default, a format, a model
name, a Firestore field path — is named here so it can only be wrong once.
"""

# ---------- defaults ----------

DEFAULT_TIMEZONE = "America/New_York"
DEFAULT_PLAN = "free"
ADMIN_PLAN = "admin"

# The Firestore document holding the public demo summary (legacy convention).
DEMO_USER_ID = "default_user"

# ---------- formats ----------

# How the legacy pipeline writes pipeline_status timestamps. Unchanged so the
# frozen backend and this layer keep reading each other's writes.
UTC_TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S %Z(%z)"
UTC_TIMESTAMP_PARSE_FORMAT = "%Y-%m-%d %H:%M:%S"

# ---------- chat ----------

CHAT_MODEL = "gpt-5-mini"
CHAT_MAX_CONTEXT_TOKENS = 128_000
CHAT_MAX_OUTPUT_TOKENS = 4 * 1024

# ---------- generation ----------

# A run that started longer ago than this is assumed dead, so a crashed
# pipeline cannot lock a user out of generating forever. The legacy app had no
# lock at all.
GENERATION_STALE_LOCK_MINUTES = 30

# Error codes services raise for failures the client can act on. Routers map
# these to status codes; the web app maps them to sentences.
ERROR_GENERATION_IN_PROGRESS = "generation_in_progress"
ERROR_NO_ACCOUNTS = "no_accounts"
ERROR_NO_VERIFIED_ACCOUNTS = "no_verified_accounts"
ERROR_INSUFFICIENT_CREDITS = "insufficient_credits"

# ---------- accounts ----------

MAX_IMPORTED_FOLLOWEES = 1000

# ---------- onboarding survey answers ----------
# Mirrored by the web SURVEY_QUESTIONS; keep in sync when the wizard's
# options change.

ONBOARDING_ROLES = {
    "founder": "Founder",
    "engineer": "Engineer",
    "marketer": "Marketer",
    "investor": "Investor",
    "creator": "Creator",
    "student": "Student",
}
ONBOARDING_TOPICS = {
    "product": "My product or brand",
    "ai_tech": "AI & tech",
    "finance_crypto": "Finance & crypto",
    "news_politics": "News & politics",
    "sports": "Sports",
}

# ---------- Firestore field paths ----------

FIELD_PLAN = "plan"
FIELD_STRIPE_CUSTOMER_ID = "stripe_customer_id"
FIELD_ONBOARDING_SURVEY = "onboarding_survey"
FIELD_ACCOUNTS = "settings_X.accounts"
FIELD_VERIFIED_ACCOUNTS = "settings_X.verified_accounts"
FIELD_TIMEZONE = "settings_global.timezone"
FIELD_AI_PROMPT = "settings_global.ai_prompt"
FIELD_NEWSLETTER_EMAIL = "settings_global.newsletter_email"
FIELD_SUMMARY_HTML = "summary_data.summary_html"
FIELD_AUDIO_URL = "summary_data.audio_url"
FIELD_LAST_GENERATION_TIME = "summary_data.last_generation_time"
FIELD_RAW_DATA_SOURCES = "summary_data.raw_data_sources"
FIELD_PIPELINE_STATUS = "pipeline_status"
FIELD_PIPELINE_STAGE = "pipeline_status.current_stage"
FIELD_PIPELINE_STATE = "pipeline_status.status"
FIELD_PIPELINE_STAGES_DONE = "pipeline_status.stages_completed"
FIELD_PIPELINE_ERROR = "pipeline_status.error"
FIELD_PIPELINE_START = "pipeline_status.start_time"
FIELD_PIPELINE_END = "pipeline_status.end_time"
