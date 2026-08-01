import os
from openai import OpenAI
from utils import get_logger
import google.generativeai as genai
from backend.ml_module.utils import count_tokens

logger = get_logger("main_logger")


def use_gpt(prompt, model="gpt-4o-mini", max_tokens=1024 * 4):
    openai_api_key = os.environ["OPENAI_API_KEY"]
    client = OpenAI(api_key=openai_api_key)
    logger.info("Sending request to GPT...")
    logger.debug(f"Using model: {model}")

    # cost tracker
    cost_tracker = {"models": {model: {}}}

    # count input tokens
    input_token_count = count_tokens(prompt, model=model)
    cost_tracker["models"][model]["n_tokens_input"] = input_token_count

    # generate output
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            stream=False,
        )
        output_text = response.choices[0].message.content
        output_token_count = count_tokens(output_text, model=model)
        cost_tracker["models"][model]["n_tokens_output"] = output_token_count
        cost_tracker["models"][model]["n_calls"] = 1
        return output_text, cost_tracker
    except Exception as e:
        logger.error(f"Error in GPT API call: {str(e)}")
        return None


def use_gemini(prompt, model="gemini-flash-latest", max_tokens=None):
    gemini_api_key = os.environ["GEMINI_API_KEY"]
    genai.configure(api_key=gemini_api_key)

    logger.info("Sending request to Gemini...")
    logger.info(f"Using model: {model}")

    # cost tracker
    cost_tracker = {"models": {model: {}}}

    try:
        m = genai.GenerativeModel(model)
        if max_tokens is not None:
            response_gen_config = genai.GenerationConfig(max_output_tokens=max_tokens)
        else:
            response_gen_config = genai.GenerationConfig()
        response = m.generate_content(prompt, generation_config=response_gen_config)
        output_text = response.text
        usage = response.usage_metadata
        cost_tracker["models"][model]["n_tokens_input"] = usage.prompt_token_count
        cost_tracker["models"][model]["n_tokens_output"] = usage.candidates_token_count
        if "cached_content_token_count" in usage:
            cost_tracker["models"][model]["n_tokens_cached"] = usage[
                "cached_content_token_count"
            ]
        cost_tracker["models"][model]["n_calls"] = 1
        return output_text, cost_tracker
    except Exception as e:
        logger.error(f"Error in Gemini API call: {str(e)}")
        return None


def generate_audio(transcript, audio_path, char_limit=4096):
    openai_api_key = os.environ["OPENAI_API_KEY"]
    client = OpenAI(api_key=openai_api_key)
    logger.info("Generating audio using OpenAI...")
    cost_tracker = {"models": {"tts-1": {}}}

    # count input characters
    input_char_count = len(transcript)
    cost_tracker["models"]["tts-1"]["n_chars_input"] = input_char_count

    # assert characrter length
    if input_char_count > char_limit:
        logger.error(f"Transcript is too long. Max length is {char_limit} characters but input length is {input_char_count} characters.")
        return False, {}

    # generate audio
    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=transcript,
        )
        response.stream_to_file(audio_path)
        logger.info(f"Audio saved to {audio_path}")
        cost_tracker["models"]["tts-1"]["n_calls"] = 1
        return True, cost_tracker
    except Exception as e:
        logger.error(f"Error in audio generation: {str(e)}")
        return False
