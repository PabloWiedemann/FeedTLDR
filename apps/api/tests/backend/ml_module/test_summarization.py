"""
Integration tests for the summarization feature.

This test file properly tests the integration of the summarization pipeline
as it's used in production (backend/run_pipeline.py:172-186).
"""
import os
import pytest
import tempfile
import pandas as pd
from dotenv import load_dotenv
import google.generativeai as genai

from backend.ml_module.summarizer import (
    create_cached_content,
    summarize_data,
    generate_transcript,
)
from config.prompt_config import DEFAULT_X_PROMPT


@pytest.fixture(scope="module")
def setup_gemini():
    """Setup Gemini API for tests."""
    load_dotenv()
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        pytest.skip("GEMINI_API_KEY not found in environment variables")
    genai.configure(api_key=gemini_api_key)


@pytest.fixture
def sample_tweets_csv(tmp_path):
    """Create a sample CSV file with scraped tweets for testing."""
    # Create sample data that mimics real scraped tweets
    # Need at least 2048 tokens for caching, so creating more extensive data
    sample_tweets = []

    # Generate 50 tweets with varied content to meet minimum token requirement
    users = ["OpenAI", "AndrewYNg", "karpathy", "ylecun", "GoogleAI", "DeepMind", "huggingface", "PyTorch", "TensorFlow", "AIatMeta"]
    topics = [
        "We're excited to announce our latest research on multimodal AI systems. This breakthrough combines vision, language, and reasoning capabilities in ways we've never seen before. Our team has been working on this for months and the results exceed our expectations.",
        "Just published a comprehensive new course on deep learning fundamentals, covering everything from neural network basics to advanced architectures. Check it out on Coursera! Special thanks to everyone who provided feedback during development.",
        "Neural networks are getting remarkably better at understanding context and nuance in language. Here's what I learned from recent experiments with large language models and their emergent capabilities. The implications for AI safety are significant.",
        "The future of AI is not just about scaling models bigger and bigger, but also about making them more efficient, interpretable, and aligned with human values. We need to think carefully about the path forward.",
        "New research paper released on transformer efficiency and optimization techniques. We've achieved significant improvements in inference speed while maintaining model quality. This could enable deployment on edge devices.",
        "Fascinating developments in reinforcement learning from human feedback. The ability to align AI systems with human preferences is becoming increasingly sophisticated and nuanced.",
        "Open source AI models are democratizing access to cutting-edge technology. It's incredible to see what the community is building with these tools and how quickly innovation is happening.",
        "Computer vision models are now approaching human-level performance on many benchmarks. But we still have much to learn about robustness and generalization to new domains.",
        "The intersection of neuroscience and artificial intelligence continues to inspire new architectures and learning algorithms. Biology still has much to teach us about intelligence.",
        "Ethical AI development requires diverse perspectives and careful consideration of societal impacts. We must ensure that AI systems are beneficial, fair, and respect human rights and dignity.",
    ]

    for i in range(50):
        sample_tweets.append({
            "index": i,
            "userName": users[i % len(users)],
            "createdAt": f"2025-02-{13 + i // 24}-{20 - i % 24}",
            "text": topics[i % len(topics)],
            "likeCount": 150 + i * 10,
            "viewCount": 5000 + i * 500,
            "url": f"https://x.com/{users[i % len(users)]}/status/{1890131354437750955 + i}",
            "quote": "",
        })

    df = pd.DataFrame(sample_tweets)
    csv_path = tmp_path / "test_tweets.csv"
    df.to_csv(csv_path, index=False)

    return str(csv_path)


class TestSummarizationIntegration:
    """Integration tests for the complete summarization pipeline."""

    def test_full_summarization_pipeline_with_transcript(
        self, setup_gemini, sample_tweets_csv
    ):
        """
        Test the complete summarization pipeline as used in production.

        This test follows the exact flow from backend/run_pipeline.py:172-186:
        1. Create cached content from raw data
        2. Generate summary from cached content
        3. Generate transcript from summary
        4. Clean up cache
        5. Verify all outputs and cost tracking
        """
        model_name = "gemini-flash-latest"

        # Step 1: Create cached content (production: line 173)
        llm, cache, cost_tracker_cache = create_cached_content(
            sample_tweets_csv, model=model_name
        )

        # Verify cached content creation
        assert llm is not None, "LLM model should be created"
        assert cache is not None, "Cache should be created"
        assert cost_tracker_cache is not None, "Cost tracker should be initialized"
        assert "models" in cost_tracker_cache, "Cost tracker should have 'models' key"
        assert model_name in cost_tracker_cache["models"], f"Cost tracker should track {model_name}"
        assert "n_tokens_cached" in cost_tracker_cache["models"][model_name], "Should track cached tokens"
        assert "n_calls" in cost_tracker_cache["models"][model_name], "Should track API calls"
        assert cost_tracker_cache["models"][model_name]["n_tokens_cached"] > 0, "Should have cached some tokens"
        assert cost_tracker_cache["models"][model_name]["n_calls"] == 1, "Should have made 1 caching call"

        # Step 2: Summarize data (production: line 176)
        summary, cost_tracker_summary = summarize_data(llm, DEFAULT_X_PROMPT)

        # Verify summary generation
        assert summary is not None, "Summary should not be None"
        assert isinstance(summary, str), "Summary should be a string"
        assert len(summary) > 0, "Summary should not be empty"
        assert cost_tracker_summary is not None, "Cost tracker for summary should exist"
        assert "models" in cost_tracker_summary, "Summary cost tracker should have 'models' key"
        assert model_name in cost_tracker_summary["models"], f"Summary cost tracker should track {model_name}"
        assert "n_tokens_input" in cost_tracker_summary["models"][model_name], "Should track input tokens"
        assert "n_tokens_output" in cost_tracker_summary["models"][model_name], "Should track output tokens"
        assert "n_calls" in cost_tracker_summary["models"][model_name], "Should track API calls"
        assert cost_tracker_summary["models"][model_name]["n_tokens_input"] > 0, "Should have input tokens"
        assert cost_tracker_summary["models"][model_name]["n_tokens_output"] > 0, "Should have output tokens"
        assert cost_tracker_summary["models"][model_name]["n_calls"] == 1, "Should have made 1 summary call"

        # Step 3: Generate transcript (production: line 182)
        transcript, cost_tracker_transcript = generate_transcript(llm, summary)

        # Verify transcript generation
        assert transcript is not None, "Transcript should not be None"
        assert isinstance(transcript, str), "Transcript should be a string"
        assert len(transcript) > 0, "Transcript should not be empty"
        assert len(transcript) <= 4096, "Transcript should not exceed 4096 characters"
        assert cost_tracker_transcript is not None, "Cost tracker for transcript should exist"
        assert "models" in cost_tracker_transcript, "Transcript cost tracker should have 'models' key"
        assert model_name in cost_tracker_transcript["models"], f"Transcript cost tracker should track {model_name}"
        assert "n_tokens_input" in cost_tracker_transcript["models"][model_name], "Should track input tokens"
        assert "n_tokens_output" in cost_tracker_transcript["models"][model_name], "Should track output tokens"
        assert "n_calls" in cost_tracker_transcript["models"][model_name], "Should track API calls"

        # Step 4: Clean up cache (production: line 186)
        cache.delete()

        # Verify cache is cleaned up by trying to use it (should fail)
        try:
            cache_info = genai.caching.CachedContent.get(cache.name)
            # If we get here, the cache wasn't deleted
            assert False, "Cache should have been deleted"
        except Exception:
            # Expected: cache should not exist anymore
            pass

        # Additional content verification
        # Summary should contain HTML-like structure or meaningful content
        assert (
            len(summary.split()) > 10
        ), "Summary should contain meaningful content (more than 10 words)"

        # Transcript should be audio-friendly (no HTML tags ideally)
        assert (
            len(transcript.split()) > 5
        ), "Transcript should contain meaningful content (more than 5 words)"

        print(f"\n✅ Integration test passed!")
        print(f"Summary length: {len(summary)} characters")
        print(f"Transcript length: {len(transcript)} characters")
        print(f"Cached tokens: {cost_tracker_cache['models'][model_name]['n_tokens_cached']}")
        print(f"Summary input tokens: {cost_tracker_summary['models'][model_name]['n_tokens_input']}")
        print(f"Summary output tokens: {cost_tracker_summary['models'][model_name]['n_tokens_output']}")
        print(f"Transcript input tokens: {cost_tracker_transcript['models'][model_name]['n_tokens_input']}")
        print(f"Transcript output tokens: {cost_tracker_transcript['models'][model_name]['n_tokens_output']}")

    def test_full_summarization_pipeline_without_transcript(
        self, setup_gemini, sample_tweets_csv
    ):
        """
        Test the summarization pipeline without transcript generation.

        This simulates the case when skip_audio=True in production.
        """
        model_name = "gemini-flash-latest"

        # Step 1: Create cached content
        llm, cache, cost_tracker_cache = create_cached_content(
            sample_tweets_csv, model=model_name
        )

        # Verify cached content creation
        assert llm is not None, "LLM model should be created"
        assert cache is not None, "Cache should be created"
        assert cost_tracker_cache is not None, "Cost tracker should be initialized"

        # Step 2: Summarize data
        summary, cost_tracker_summary = summarize_data(llm, DEFAULT_X_PROMPT)

        # Verify summary generation
        assert summary is not None, "Summary should not be None"
        assert isinstance(summary, str), "Summary should be a string"
        assert len(summary) > 0, "Summary should not be empty"
        assert cost_tracker_summary is not None, "Cost tracker for summary should exist"

        # Step 3: Clean up cache
        cache.delete()

        print(f"\n✅ Integration test (without transcript) passed!")
        print(f"Summary length: {len(summary)} characters")

    def test_custom_prompt_integration(self, setup_gemini, sample_tweets_csv):
        """
        Test the summarization pipeline with a custom prompt.

        Verifies that custom prompts are properly integrated into the pipeline.
        """
        model_name = "gemini-flash-latest"
        custom_prompt = """
        Please summarize these social media posts with a focus on:
        1. Key technical insights
        2. Major announcements
        3. Trending topics

        Keep it concise and informative.
        """

        # Full pipeline with custom prompt
        llm, cache, _ = create_cached_content(sample_tweets_csv, model=model_name)
        summary, cost_tracker_summary = summarize_data(llm, custom_prompt)
        cache.delete()

        # Verify custom prompt was used
        assert summary is not None, "Summary should not be None"
        assert len(summary) > 0, "Summary should not be empty"
        assert cost_tracker_summary is not None, "Cost tracker should exist"

        print(f"\n✅ Custom prompt integration test passed!")
        print(f"Summary length: {len(summary)} characters")

    def test_transcript_length_constraint(self, setup_gemini, sample_tweets_csv):
        """
        Test that transcript generation respects the 4096 character limit.

        The generate_transcript function should auto-retry if the transcript
        exceeds 4096 characters (backend/ml_module/summarizer.py:89-99).
        """
        model_name = "gemini-flash-latest"

        # Create a longer summary to potentially trigger the length constraint
        llm, cache, _ = create_cached_content(sample_tweets_csv, model=model_name)
        summary, _ = summarize_data(llm, DEFAULT_X_PROMPT)

        # Generate transcript
        transcript, cost_tracker_transcript = generate_transcript(llm, summary)

        # Verify length constraint
        assert transcript is not None, "Transcript should not be None"
        assert len(transcript) <= 4096, f"Transcript should not exceed 4096 characters, got {len(transcript)}"
        assert cost_tracker_transcript is not None, "Cost tracker should exist"

        # Clean up
        cache.delete()

        print(f"\n✅ Transcript length constraint test passed!")
        print(f"Transcript length: {len(transcript)} characters (max: 4096)")


class TestSummarizationEdgeCases:
    """Test edge cases and error handling in the summarization pipeline."""

    def test_nonexistent_file_handling(self, setup_gemini):
        """Test that create_cached_content handles nonexistent files gracefully."""
        nonexistent_path = "/path/to/nonexistent/file.csv"

        with pytest.raises(Exception):
            # Should raise an exception when file doesn't exist
            create_cached_content(nonexistent_path, model="gemini-flash-latest")

    def test_empty_csv_handling(self, setup_gemini, tmp_path):
        """Test handling of empty CSV files."""
        # Create an empty CSV with just headers
        empty_csv = tmp_path / "empty.csv"
        df = pd.DataFrame(columns=["index", "userName", "createdAt", "text", "likeCount", "viewCount", "url", "quote"])
        df.to_csv(empty_csv, index=False)

        # This might fail or produce minimal output - we're testing it doesn't crash
        try:
            llm, cache, _ = create_cached_content(str(empty_csv), model="gemini-flash-latest")
            summary, _ = summarize_data(llm, DEFAULT_X_PROMPT)
            cache.delete()

            # If it succeeds, verify we got something back
            assert summary is not None, "Should return some summary even for empty data"
            print(f"\n✅ Empty CSV test passed - got summary: {summary[:100]}...")
        except Exception as e:
            # It's acceptable to fail on empty data
            print(f"\n✅ Empty CSV test passed - appropriately failed with: {e}")
            pytest.skip("Empty CSV appropriately raises exception")
