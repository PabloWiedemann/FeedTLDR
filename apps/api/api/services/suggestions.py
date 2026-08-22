"""Suggested X accounts for users with a short list, keyed by onboarding
answers.

The lists target the working-professional ICP: accounts people follow to
stay current for their work, not entertainment. Curated 2026-08; revisit
when a handle goes quiet or a category underperforms.
"""

from api.constants import ONBOARDING_ROLES, ONBOARDING_TOPICS

SUGGESTED_ACCOUNTS: dict[str, list[str]] = {
    "ai_tech": [
        "karpathy",
        "sama",
        "AndrewYNg",
        "ylecun",
        "OpenAI",
        "AnthropicAI",
        "GoogleDeepMind",
        "lexfridman",
        "emollick",
        "simonw",
    ],
    "finance_crypto": [
        "morganhousel",
        "AswathDamodaran",
        "charliebilello",
        "elerianm",
        "LizAnnSonders",
        "RayDalio",
        "APompliano",
        "VitalikButerin",
        "business",
        "WSJmarkets",
    ],
    "news_politics": [
        "Reuters",
        "AP",
        "axios",
        "politico",
        "TheEconomist",
        "FT",
        "NPR",
        "WSJ",
        "nytimes",
        "BBCWorld",
    ],
    "sports": [
        "espn",
        "TheAthletic",
        "AdamSchefter",
        "FabrizioRomano",
        "BBCSport",
        "SkySportsNews",
        "NBA",
        "NFL",
        "F1",
        "premierleague",
    ],
    "founder": [
        "paulg",
        "naval",
        "ycombinator",
        "garrytan",
        "pmarca",
        "jasonlk",
        "lennysan",
        "gregisenberg",
        "a16z",
        "shl",
    ],
    "engineer": [
        "GitHub",
        "ThePrimeagen",
        "swyx",
        "levelsio",
        "rauchg",
        "t3dotgg",
        "kentcdodds",
        "addyosmani",
        "mitchellh",
        "dhh",
    ],
    "marketer": [
        "harrydry",
        "amandanat",
        "thejustinwelsh",
        "AprilDunford",
        "randfish",
        "kieranflanagan",
        "jackbutcher",
        "davegerhardt",
        "RyanHoliday",
        "stephsmithio",
    ],
    "creator": [
        "thejustinwelsh",
        "jayclouse",
        "ColinandSamir",
        "nathanbarry",
        "gregisenberg",
        "jackconte",
        "david_perell",
        "dickiebush",
        "polina_marinova",
        "jackbutcher",
    ],
    "general": [
        "naval",
        "paulg",
        "sama",
        "AdamMGrant",
        "morganhousel",
        "TheEconomist",
        "business",
        "SahilBloom",
        "lennysan",
        "simonsinek",
    ],
}

# Survey answers (see the onboarding SURVEY_QUESTIONS) mapped to lists.
TOPIC_TO_LIST = {
    ONBOARDING_TOPICS["ai_tech"]: "ai_tech",
    ONBOARDING_TOPICS["finance_crypto"]: "finance_crypto",
    ONBOARDING_TOPICS["news_politics"]: "news_politics",
    ONBOARDING_TOPICS["sports"]: "sports",
}
ROLE_TO_LIST = {
    ONBOARDING_ROLES["founder"]: "founder",
    ONBOARDING_ROLES["engineer"]: "engineer",
    ONBOARDING_ROLES["marketer"]: "marketer",
    ONBOARDING_ROLES["creator"]: "creator",
    # Investors read the finance list; students get the general fallback.
    ONBOARDING_ROLES["investor"]: "finance_crypto",
}
GENERAL_LIST = "general"


def suggested_for(
    survey: dict | None, existing_handles: list[str]
) -> list[str]:
    """Ordered, deduped suggestions for one user, minus handles the user
    already follows."""
    taken = {handle.lstrip("@").casefold() for handle in existing_handles}
    suggestions: list[str] = []
    for key in _list_keys_for(survey or {}):
        for handle in SUGGESTED_ACCOUNTS[key]:
            folded = handle.casefold()
            if folded in taken:
                continue
            taken.add(folded)
            suggestions.append(handle)
    return suggestions


def _list_keys_for(survey: dict) -> list[str]:
    """Topic lists first (they state intent most directly), then the role
    list. Custom "Other" answers match no list; with no usable answer, the
    general list applies."""
    topics = survey.get("topics") or []
    if isinstance(topics, str):
        topics = [topics]

    keys: list[str] = []
    for topic in topics:
        key = TOPIC_TO_LIST.get(topic)
        if key and key not in keys:
            keys.append(key)
    role_key = ROLE_TO_LIST.get(survey.get("role") or "")
    if role_key and role_key not in keys:
        keys.append(role_key)
    return keys or [GENERAL_LIST]
