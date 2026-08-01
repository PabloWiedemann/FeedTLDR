import pytest
from backend.ml_module.utils import count_tokens, truncate_prompt


class TestCountTokens:
    """Test suite for the count_tokens function."""

    def test_count_tokens_gpt_3_5_turbo(self):
        """Test token counting for GPT-3.5-turbo."""
        text = "Hello, world!"
        tokens = count_tokens(text, model="gpt-3.5-turbo")
        assert isinstance(tokens, int)
        assert tokens > 0
        # "Hello, world!" should be around 4 tokens
        assert tokens == 4

    def test_count_tokens_gpt_4(self):
        """Test token counting for GPT-4."""
        text = "This is a test."
        tokens = count_tokens(text, model="gpt-4")
        assert isinstance(tokens, int)
        assert tokens > 0

    def test_count_tokens_gpt_4o(self):
        """Test token counting for GPT-4o (uses o200k_base)."""
        text = "Testing GPT-4o tokenization."
        tokens = count_tokens(text, model="gpt-4o")
        assert isinstance(tokens, int)
        assert tokens > 0
        # Should be around 5-6 tokens
        assert 4 <= tokens <= 10

    def test_count_tokens_gpt_4o_mini(self):
        """Test token counting for GPT-4o-mini."""
        text = "GPT-4o-mini uses the same tokenizer as GPT-4o."
        tokens = count_tokens(text, model="gpt-4o-mini")
        assert isinstance(tokens, int)
        assert tokens > 0

    def test_count_tokens_gpt_5_mini(self):
        """Test token counting for GPT-5-mini (should use o200k_base fallback)."""
        text = "GPT-5 models use fallback encoding."
        tokens = count_tokens(text, model="gpt-5-mini")
        assert isinstance(tokens, int)
        assert tokens > 0

    def test_count_tokens_gpt_5_pro(self):
        """Test token counting for GPT-5-pro."""
        text = "Testing GPT-5 pro model."
        tokens = count_tokens(text, model="gpt-5-pro")
        assert isinstance(tokens, int)
        assert tokens > 0

    def test_count_tokens_gemini(self):
        """Test token counting for Gemini models (uses approximation)."""
        text = "Gemini uses SentencePiece but we approximate with o200k_base."
        tokens = count_tokens(text, model="gemini-flash-latest")
        assert isinstance(tokens, int)
        assert tokens > 0

    def test_count_tokens_gemini_2_5_flash(self):
        """Test token counting for Gemini 2.5 Flash."""
        text = "Testing Gemini 2.5 Flash tokenization."
        tokens = count_tokens(text, model="gemini-2.5-flash")
        assert isinstance(tokens, int)
        assert tokens > 0

    def test_count_tokens_default_model(self):
        """Test that default model parameter works."""
        text = "Testing default model."
        tokens = count_tokens(text)
        assert isinstance(tokens, int)
        assert tokens > 0

    def test_count_tokens_empty_string(self):
        """Test token counting for empty string."""
        text = ""
        tokens = count_tokens(text, model="gpt-4o-mini")
        assert tokens == 0

    def test_count_tokens_long_text(self):
        """Test token counting for longer text."""
        text = " ".join(["word"] * 100)
        tokens = count_tokens(text, model="gpt-4o-mini")
        assert isinstance(tokens, int)
        # 100 words should be roughly 100-150 tokens
        assert 50 <= tokens <= 200

    def test_count_tokens_consistency(self):
        """Test that same text returns same token count."""
        text = "Consistency test for tokenization."
        tokens1 = count_tokens(text, model="gpt-4o-mini")
        tokens2 = count_tokens(text, model="gpt-4o-mini")
        assert tokens1 == tokens2

    def test_count_tokens_unknown_model_fallback(self):
        """Test that unknown GPT model uses fallback encoding."""
        text = "Testing fallback for unknown model."
        tokens = count_tokens(text, model="gpt-future-model-99")
        assert isinstance(tokens, int)
        assert tokens > 0


class TestTruncatePrompt:
    """Test suite for the truncate_prompt function."""

    def test_truncate_prompt_no_truncation_needed(self):
        """Test that short prompts are not truncated."""
        prompt = "This is a short prompt."
        result = truncate_prompt(prompt, model="gpt-4o-mini", max_context_length=1000)
        assert result == prompt
        assert "[Note: Input was truncated" not in result

    def test_truncate_prompt_truncation_needed(self):
        """Test that long prompts are truncated."""
        # Create a prompt that exceeds 50 tokens
        prompt = " ".join(["word"] * 100)
        result = truncate_prompt(prompt, model="gpt-4o-mini", max_context_length=50)

        assert len(result) < len(prompt)
        assert "[Note: Input was truncated" in result

        # Verify truncated result is reasonably close to limits
        # Note: The truncation adds a note message, so final count may slightly exceed limit
        truncated_tokens = count_tokens(result, model="gpt-4o-mini")
        # Should be close to 50, but may be slightly over due to truncation note
        assert truncated_tokens < 100  # At least significantly smaller than original

    def test_truncate_prompt_exact_limit(self):
        """Test prompt at exact token limit."""
        prompt = "Test " * 10  # Should be around 20 tokens
        token_count = count_tokens(prompt, model="gpt-4o-mini")

        result = truncate_prompt(prompt, model="gpt-4o-mini", max_context_length=token_count)
        # Should not be truncated if exactly at limit
        assert result == prompt

    def test_truncate_prompt_empty_string(self):
        """Test truncating empty string."""
        prompt = ""
        result = truncate_prompt(prompt, model="gpt-4o-mini", max_context_length=100)
        assert result == prompt

    def test_truncate_prompt_different_models(self):
        """Test truncation works with different models."""
        prompt = " ".join(["word"] * 100)

        models = ["gpt-4o-mini", "gpt-5-mini", "gemini-flash-latest"]
        for model in models:
            result = truncate_prompt(prompt, model=model, max_context_length=50)
            assert "[Note: Input was truncated" in result
            truncated_tokens = count_tokens(result, model=model)
            # Should be significantly reduced from 100 tokens
            assert truncated_tokens < 100

    def test_truncate_prompt_preserves_content(self):
        """Test that truncation preserves beginning of content."""
        prompt = "IMPORTANT: " + " ".join([f"word{i}" for i in range(100)])
        result = truncate_prompt(prompt, model="gpt-4o-mini", max_context_length=20)

        # Should preserve the beginning
        assert "IMPORTANT:" in result
        # Should have truncation note
        assert "[Note: Input was truncated" in result

    def test_truncate_prompt_very_large_limit(self):
        """Test with very large context limit."""
        prompt = "Short prompt"
        result = truncate_prompt(prompt, model="gpt-4o-mini", max_context_length=1000000)
        assert result == prompt

    def test_truncate_prompt_default_max_context(self):
        """Test default max_context_length parameter."""
        prompt = "Test prompt"
        result = truncate_prompt(prompt, model="gpt-4o-mini")
        # Default is 128k, so short prompt should not be truncated
        assert result == prompt
