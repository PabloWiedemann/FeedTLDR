"""API smoke tests: run without any credentials or network access. They pin the
contract surface (routes exist, auth is enforced, schema exports)."""

from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def test_healthz():
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_openapi_exports_expected_paths():
    r = client.get("/openapi.json")
    assert r.status_code == 200
    paths = r.json()["paths"]
    expected = [
        "/v1/auth/register",
        "/v1/me",
        "/v1/settings",
        "/v1/settings/accounts",
        "/v1/settings/accounts/verify",
        "/v1/settings/accounts/import",
        "/v1/feed",
        "/v1/demo/feed",
        "/v1/feed/source-data",
        "/v1/generations",
        "/v1/generations/cost",
        "/v1/generations/status",
        "/v1/chat",
        "/v1/billing/plans",
        "/v1/billing/checkout",
        "/v1/billing/portal",
        "/v1/billing/usage",
    ]
    for path in expected:
        assert path in paths, f"missing path: {path}"


def test_auth_required_endpoints_reject_missing_token():
    for method, path in [
        ("get", "/v1/me"),
        ("get", "/v1/settings"),
        ("get", "/v1/feed"),
        ("get", "/v1/generations/status"),
        ("post", "/v1/generations"),
        ("post", "/v1/chat"),
        ("post", "/v1/billing/portal"),
    ]:
        if method == "post":
            r = client.post(path, json={})
        else:
            r = client.get(path)
        assert r.status_code in (401, 422), f"{path} returned {r.status_code}"


def test_plans_endpoint_is_public_and_static():
    r = client.get("/v1/billing/plans")
    assert r.status_code == 200
    plans = {p["id"]: p for p in r.json()["plans"]}
    assert set(plans) == {"free", "basic", "pro"}
    assert plans["free"]["price_month"] == 0
    assert plans["pro"]["max_followers"] == 500


def test_generation_cost_math_matches_calculator():
    from api.services import compute_generation_cost
    from backend.credits import CreditsCalculator

    calc = CreditsCalculator()
    full = compute_generation_cost("free", fetch_latest=True, skip_audio=False)
    assert full == __import__("math").ceil(calc.compute_full_gen_run_credits("free"))
    resummarize = compute_generation_cost("free", fetch_latest=False, skip_audio=False)
    assert resummarize < full


def test_generation_lock_logic():
    from api.services import generation_is_locked

    assert generation_is_locked("in_progress", None) is True
    assert generation_is_locked("success", None) is False
    assert generation_is_locked("error", None) is False
    # stale in_progress runs do not lock forever
    assert generation_is_locked("in_progress", "2020-01-01 00:00:00 UTC(+0000)") is False


def test_sanitizer_strips_scripts():
    from api.services import sanitize_summary_html

    dirty = '<h3>Title</h3><script>alert(1)</script><p onclick="x()">Body</p>'
    clean = sanitize_summary_html(dirty)
    assert "<script>" not in clean
    assert "onclick" not in clean
    assert "<h3>" in clean and "Body" in clean


def test_normalize_handles():
    from api.services import normalize_handles

    assert normalize_handles([" elonmusk", "@karpathy", "@ELONMUSK", ""]) == [
        "@elonmusk",
        "@karpathy",
    ]
