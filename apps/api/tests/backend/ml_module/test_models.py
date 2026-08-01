from backend.ml_module.models import use_gpt, use_gemini
import os


def test_use_gpt(require_api_keys):
    prompt = "What is the capital of France?"
    text, cost_tracker = use_gpt(prompt)
    assert text is not None
    assert isinstance(text, str)
    assert len(text) > 0
    assert "paris" in text.lower()


def test_use_gemini(require_api_keys):
    prompt = "What is the capital of France?"
    text, cost_tracker = use_gemini(prompt)
    assert text is not None
    assert isinstance(text, str)
    assert len(text) > 0
    assert "paris" in text.lower()


def test_use_gpt_error(require_api_keys):
    prompt = "What is the capital of France?"

    # Set invalid API key to trigger error
    original_key = os.environ.get("OPENAI_API_KEY")
    os.environ["OPENAI_API_KEY"] = "invalid_key"

    print("Testing proper handling of error api call...")
    response = use_gpt(prompt)
    assert response is None

    # Restore original key
    if original_key:
        os.environ["OPENAI_API_KEY"] = original_key
    else:
        del os.environ["OPENAI_API_KEY"]
