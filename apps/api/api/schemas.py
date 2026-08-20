"""Pydantic models for the v1 API. These drive openapi.json, which drives the
generated TypeScript client (pnpm gen:api in apps/web)."""

from typing import Optional, Union

from pydantic import BaseModel, Field

from api.constants import DEFAULT_TIMEZONE


# ---------- shared ----------


class Message(BaseModel):
    detail: str


class UrlResponse(BaseModel):
    url: str


# ---------- auth / me ----------


class SignupChallengeRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    turnstile_token: Optional[str] = None


class SignupChallengeResponse(BaseModel):
    challenge_token: str


class RegisterRequest(BaseModel):
    name: str = ""
    avatar: str = ""
    is_google_auth: bool = False
    tos_accepted: bool = False
    signup_challenge: Optional[str] = None


class RegisterResponse(BaseModel):
    created: bool
    already_registered: bool = False


class PlanInfo(BaseModel):
    period: Optional[str] = None
    status: Optional[str] = None
    cancel_at_period_end: bool = False
    current_period_start: Optional[int] = None
    current_period_end: Optional[int] = None


class UsageCounts(BaseModel):
    n_generations: int = 0
    n_newsletters_sent: int = 0
    n_chat_messages: int = 0
    n_followers_scraped: int = 0

    @classmethod
    def from_plan_usage(cls, usage: dict) -> "UsageCounts":
        """Read the counters out of one plan's plan_usage sub-document."""
        return cls(**{name: usage.get(name, 0) for name in cls.model_fields})


class CreditState(BaseModel):
    monthly_left: int
    prepaid_left: int
    monthly_limit: int
    prepaid_limit: int

    @classmethod
    def from_state(cls, state) -> "CreditState":
        """From the api.deps.CreditState the dependencies hand out."""
        return cls(
            monthly_left=state.monthly_left,
            prepaid_left=state.prepaid_left,
            monthly_limit=state.monthly_limit,
            prepaid_limit=state.prepaid_limit,
        )


class MeResponse(BaseModel):
    uid: str
    email: str
    name: str = ""
    avatar: str = ""
    created_at: str = ""
    plan: str
    plan_info: PlanInfo
    tos_accepted: bool = False
    onboarded: bool = False
    onboarding_step: int = 0
    onboarding_survey: dict[str, Union[str, list[str]]] = {}
    usage: UsageCounts
    credits: CreditState


class UpdateMeRequest(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    tos_accepted: Optional[bool] = None
    onboarded: Optional[bool] = None
    onboarding_step: Optional[int] = None
    onboarding_survey: Optional[dict[str, Union[str, list[str]]]] = None


# ---------- settings ----------


class GlobalSettings(BaseModel):
    timezone: str = DEFAULT_TIMEZONE
    ai_prompt: str = ""
    newsletter_email: str = ""


class UpdateSettingsRequest(BaseModel):
    timezone: Optional[str] = None
    ai_prompt: Optional[str] = None
    newsletter_email: Optional[str] = None


class AccountsResponse(BaseModel):
    accounts: list[str]
    verified_accounts: list[str]
    max_accounts: int


class AddAccountsRequest(BaseModel):
    handles: list[str] = Field(min_length=1)


class VerifyAccountsResponse(BaseModel):
    verified_accounts: list[str]
    not_found: list[str]


class ImportAccountsRequest(BaseModel):
    source: str


class ImportAccountsResponse(BaseModel):
    imported: list[str]
    accounts: list[str]
    skipped_due_to_limit: int = 0


# ---------- feed ----------


class FeedResponse(BaseModel):
    is_demo: bool = False
    summary_html: str = ""
    audio_url: str = ""
    last_generation_time: str = ""
    last_generation_time_local: str = ""
    timezone: str = DEFAULT_TIMEZONE
    raw_data_sources: list[str] = []


class AccountStat(BaseModel):
    account: str
    posts: int
    avg_likes: float
    avg_views: float


class TimelinePoint(BaseModel):
    time: str
    count: int


class SourceDataResponse(BaseModel):
    total_posts: int
    total_likes: int
    total_views: int
    per_account: list[AccountStat]
    timeline: list[TimelinePoint]
    rows: list[dict]


# ---------- generations ----------


class GenerationCostResponse(BaseModel):
    cost: int
    credits: CreditState
    can_generate: bool
    blockers: list[str] = []


class StartGenerationRequest(BaseModel):
    fetch_latest: bool = True
    prompt: Optional[str] = None
    skip_audio: bool = False
    skip_email: bool = False


class GenerationStatus(BaseModel):
    current_stage: str = ""
    status: str = ""
    stages_completed: list[str] = []
    error: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None


# ---------- chat ----------


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatContext(BaseModel):
    """Which feed data the model sees; drives the composer's context cards."""

    include_posts: bool = True
    include_summary: bool = True


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)
    context: ChatContext = Field(default_factory=ChatContext)


class ChatResponse(BaseModel):
    message: ChatMessage
    credits: CreditState


# ---------- billing ----------


class PlanPublic(BaseModel):
    id: str
    price_month: Optional[float] = None
    price_year: Optional[float] = None
    max_followers: int
    max_tweets_per_generation: int
    max_credits: int
    price_id_month: Optional[str] = None
    price_id_year: Optional[str] = None


class PlansResponse(BaseModel):
    plans: list[PlanPublic]


class CheckoutRequest(BaseModel):
    price_id: str


class BillingUsageResponse(BaseModel):
    plan: str
    usage: UsageCounts
    credits: CreditState
