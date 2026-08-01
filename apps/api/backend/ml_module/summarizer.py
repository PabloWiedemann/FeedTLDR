from config.prompt_config import (
    DEFAULT_X_PROMPT,
    DEFAULT_TEXT_OUTPUT_FORMAT_PROMPT,
    DEFAULT_TRANSCRIPT_PROMPT,
)
from backend.ml_module.preprocessors import preprocess_X_data
import google.generativeai as genai
from utils import get_logger

logger = get_logger("main_logger")


def create_cached_content(raw_data_path, model="gemini-flash-latest"):
    # initialize cost tracker
    cost_tracker = {"models": {model: {}}}

    # preprocess data
    data_as_str = preprocess_X_data(raw_data_path)

    # generate cached content
    logger.info("Generating cached content...")
    cache = genai.caching.CachedContent.create(
        model=model,
        system_instruction=(
            "You are an expert at analyzing social media posts and creating summaries. "
            "Your job is to analyze the CSV data and provide insights based on the user query."
        ),
        contents=data_as_str,
    )

    # update cost tracker
    cost_tracker["models"][model][
        "n_tokens_cached"
    ] = cache.usage_metadata.total_token_count
    cost_tracker["models"][model]["n_calls"] = 1

    model = genai.GenerativeModel.from_cached_content(cache)
    return model, cache, cost_tracker


def summarize_data(
    model,
    prompt=DEFAULT_X_PROMPT,
):
    model_name = model._model_name.split("/")[-1]

    # initialize cost tracker
    cost_tracker = {"models": {model_name: {}}}

    # generate summary
    logger.info("Generating summary...")
    response = model.generate_content(prompt + DEFAULT_TEXT_OUTPUT_FORMAT_PROMPT)
    summary = response.text

    # clean output
    summary = summary.strip().replace("```html", "").replace("```", "")

    # update cost tracker
    usage = response.usage_metadata
    cost_tracker["models"][model_name]["n_tokens_input"] = usage.prompt_token_count
    cost_tracker["models"][model_name]["n_tokens_output"] = usage.candidates_token_count
    cost_tracker["models"][model_name]["n_calls"] = 1

    return summary, cost_tracker


def generate_transcript(model, summary, max_tokens=2000):
    model_name = model._model_name.split("/")[-1]

    # initialize cost tracker
    cost_tracker = {"models": {model_name: {}}}

    # generate transcript
    logger.info("Generating transcript...")
    # Use 3000 tokens to stay well under 4096 character limit
    # (roughly 3000 tokens * 1.3 chars/token ≈ 3900 chars, leaving buffer)
    response_gen_config = genai.GenerationConfig(max_output_tokens=max_tokens)
    response = model.generate_content(
        DEFAULT_TRANSCRIPT_PROMPT + f" Here is the summary:\n\n{summary}\n\n",
        generation_config=response_gen_config,
    )
    transcript = response.text

    # update cost tracker
    usage = response.usage_metadata
    cost_tracker["models"][model_name]["n_tokens_input"] = usage.prompt_token_count
    cost_tracker["models"][model_name]["n_tokens_output"] = usage.candidates_token_count
    cost_tracker["models"][model_name]["n_calls"] = 1

    # Check if response exceeds max_tokens and retry if necessary
    if len(transcript) > 4096:
        logger.warning(f"Generated transcript exceeded max_tokens ({max_tokens}), current . Retrying with explicit length constraint...")
        prompt = f"TRANSCRIPT_PROMPT:\n{DEFAULT_TRANSCRIPT_PROMPT}\n\nTRANSCRIPT:\n{transcript}\n\nAbove you are provided a transcript and the prompt it was generated from. However, it is slightly too long, it has {len(transcript)} characters but the max number of characters should be 4096. Please summarize it in 4096 characters or less but keep as much as possible the original content and follow the guidelines provided in the original prompt."
        response = model.generate_content(prompt, generation_config=response_gen_config)
        transcript = response.text
        if len(transcript) > 4096:
            logger.warning(f"Generated transcript STILL exceeded max_tokens ({max_tokens}). Retrying with explicit length constraint...")

        # update cost tracker
        usage = response.usage_metadata
        cost_tracker["models"][model_name]["n_tokens_input"] += usage.prompt_token_count
        cost_tracker["models"][model_name]["n_tokens_output"] += usage.candidates_token_count
        cost_tracker["models"][model_name]["n_calls"] += 1

    return transcript, cost_tracker
