import os
import tiktoken
import google.generativeai as genai
from utils import get_logger

logger = get_logger("main_logger")


def count_tokens(text: str, model: str = "gpt-4o-mini") -> int:
    """
    Count the number of tokens in a text string.

    Args:
        text: The input text to tokenize
        model: The model to use for tokenization (defaults to 'gpt-4o-mini')

    Returns:
        int: Number of tokens
    """
    if model.startswith("gpt"):
        try:
            # Try to get the encoding for the specific model
            encoding = tiktoken.encoding_for_model(model)
        except KeyError:
            # If model not recognized (e.g., GPT-5 models), use latest encoding
            logger.debug(f"Model {model} not recognized by tiktoken, using o200k_base encoding")
            encoding = tiktoken.get_encoding("o200k_base")
        return len(encoding.encode(text))
    elif model.startswith("gemini"):
        # For Gemini models, use the official Gemini API to count tokens
        try:
            gemini_api_key = os.environ.get("GEMINI_API_KEY")
            if gemini_api_key:
                genai.configure(api_key=gemini_api_key)
                # Use count_tokens API from Gemini
                m = genai.GenerativeModel(model)
                result = m.count_tokens(text)
                return result.total_tokens
            else:
                logger.warning("GEMINI_API_KEY not found, using tiktoken approximation")
                # Fallback to tiktoken approximation
                encoding = tiktoken.get_encoding("o200k_base")
                return len(encoding.encode(text))
        except Exception as e:
            logger.debug(f"Error counting Gemini tokens: {str(e)}, using tiktoken approximation")
            # Fallback to tiktoken approximation
            encoding = tiktoken.get_encoding("o200k_base")
            return len(encoding.encode(text))
    else:
        # For any other models, use latest encoding as approximation
        encoding = tiktoken.get_encoding("o200k_base")
        return len(encoding.encode(text))


def truncate_prompt(prompt: str, model: str, max_context_length: int = 128000) -> str:
    """
    Truncates a prompt to fit within a model's context window.

    Args:
        prompt: The input prompt to truncate
        model: The model name to use for token counting
        max_context_length: Maximum number of tokens allowed (default: 128k for GPT-5)

    Returns:
        str: Truncated prompt if necessary, original prompt otherwise
    """
    token_count = count_tokens(prompt, model=model)

    if token_count <= max_context_length:
        return prompt

    logger.warning(
        f"Input length ({token_count} tokens) exceeds model's context window ({max_context_length} tokens)"
    )

    # Calculate ratio to truncate (85% of max as safety margin)
    ratio = max_context_length / token_count * 0.85
    words = prompt.split()
    truncated_length = int(len(words) * ratio)
    truncated_prompt = " ".join(words[:truncated_length])

    final_token_count = count_tokens(truncated_prompt, model=model)
    logger.info(
        f"Truncated prompt from {token_count} to {final_token_count} tokens ({final_token_count/token_count*100:.2f}%)"
    )

    return (
        truncated_prompt + "\n\n[Note: Input was truncated due to length constraints]"
    )


def generate_filler_content(num_words):
    # Simple repeatable phrase
    phrase = "This is filler text to increase token count. "
    words_per_phrase = len(phrase.split())

    # Calculate repetitions needed
    repeats = (num_words + words_per_phrase - 1) // words_per_phrase

    # Generate and truncate to exact word count
    content = phrase * repeats
    return " ".join(content.split()[:num_words])
