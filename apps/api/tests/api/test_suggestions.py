from api.constants import ONBOARDING_ROLES, ONBOARDING_TOPICS
from api.services.suggestions import SUGGESTED_ACCOUNTS, suggested_for


def test_topics_come_before_role_list():
    survey = {
        "role": ONBOARDING_ROLES["founder"],
        "topics": [ONBOARDING_TOPICS["ai_tech"]],
    }
    result = suggested_for(survey, [])
    assert result[: len(SUGGESTED_ACCOUNTS["ai_tech"])] == SUGGESTED_ACCOUNTS["ai_tech"]
    assert "paulg" in result


def test_no_usable_answers_falls_back_to_general():
    assert suggested_for(None, []) == SUGGESTED_ACCOUNTS["general"]
    assert suggested_for({"role": "Other thing", "topics": ["My product or brand"]}, []) == SUGGESTED_ACCOUNTS["general"]


def test_existing_handles_are_excluded_case_insensitively():
    survey = {"topics": [ONBOARDING_TOPICS["ai_tech"]]}
    result = suggested_for(survey, ["@KARPATHY", "sama"])
    assert "karpathy" not in result
    assert "sama" not in result


def test_single_string_topic_is_accepted():
    result = suggested_for({"topics": ONBOARDING_TOPICS["sports"]}, [])
    assert result == SUGGESTED_ACCOUNTS["sports"]


def test_overlapping_lists_do_not_duplicate():
    survey = {
        "role": ONBOARDING_ROLES["creator"],
        "topics": [ONBOARDING_TOPICS["ai_tech"]],
    }
    result = suggested_for(survey, [])
    assert len(result) == len({handle.casefold() for handle in result})
