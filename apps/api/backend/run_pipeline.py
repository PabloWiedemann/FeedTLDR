import os
import math
from backend.twitter_scraper import scrape_accounts_posts
from backend.emails_module.utils_sendgrid import send_feed_summary_email
from datetime import datetime
import pytz
import traceback
from backend.ml_module.summarizer import (
    create_cached_content,
    summarize_data,
    generate_transcript,
)
from backend.ml_module.models import generate_audio
from backend import utils_firebase
import json
from utils import run_in_thread, save_to_file, get_logger
import hashlib
import time
import random
import tempfile
from backend.credits import CreditsCalculator
from backend.utils_firebase import merge_cost_data, update_credit_usage
from pydantic import BaseModel
from typing import Optional


class CreditsUsage(BaseModel):
    monthly_credits_left: int
    prepaid_credits_left: int
    monthly_credits_limit: int
    prepaid_credits_limit: int


DEFAULT_TIME_ZONE = "US/Eastern"
USE_DEFAULT_DATA = True

current_file_dir = os.path.dirname(os.path.abspath(__file__))

credits_calculator = CreditsCalculator()

# Create logs directory if it doesn't exist
if not os.path.exists("logs"):
    os.makedirs("logs")

# Create logger
logger = get_logger("main_logger")


def save_metadata(metadata_file_path: str, metadata: dict):
    """Save metadata to a JSON file."""
    with open(metadata_file_path, "w") as f:
        json.dump(metadata, f, indent=4)


@run_in_thread
def threaded_file_upload_and_audio_url_update(
    uid: str, user_dir_name: str, generation_time: str, data_dir: str
):
    """Upload files to Firebase Storage and update the firestore DB with the audio URL."""
    utils_firebase.upload_files_to_firebase_storage(
        user_dir_name=user_dir_name, generation_time=generation_time, data_dir=data_dir
    )
    audio_url = utils_firebase.get_audio_url(user_dir_name)
    data = {"summary_data": {"audio_url": audio_url}}
    utils_firebase.update_data_firestore_DB(uid, data)


def process_data_collection(
    uid: str,
    email: str,
    followers: list[str],
    plan: str,
    timezone: str,
    local_data_dir: str,
    skip_scraping: bool = False,
    credits_usage: Optional[CreditsUsage] = None,
    current_timestamp: Optional[str] = None,
):
    """Handle data collection phase including scraping and raw data management."""
    if current_timestamp is None:
        current_timestamp = datetime.now(pytz.timezone("UTC")).strftime(
            "%Y-%m-%d %H:%M:%S %Z(%z)"
        )

    # init raw data paths
    X_raw_data_basename = "raw_scraped_tweets.csv"
    fb_X_raw_data_path = os.path.join(
        f"users/{email}_{uid}/latest", X_raw_data_basename
    )
    local_X_raw_data_path = os.path.join(local_data_dir, X_raw_data_basename)

    if skip_scraping:
        success = utils_firebase.download_raw_X_data_from_firestore(
            fb_X_raw_data_path, local_X_raw_data_path
        )
        if not success:
            logger.error(f"Failed to download raw data from Firebase for user: {email}")
            return None, 0, None
        logger.info(
            f"✅ Successfully downloaded raw X data from Firebase path '{fb_X_raw_data_path}' to local path '{local_X_raw_data_path}'"
        )
    else:
        _, cost_tracker = scrape_accounts_posts(
            accounts=followers,
            plan=plan,
            timezone=timezone,
            output_data_path=local_X_raw_data_path,
        )
        utils_firebase.update_cost_tracker(uid, cost_tracker)
        if credits_usage is not None:
            task_credit_cost = math.ceil(
                credits_calculator.compute_posts_scraping_credits(plan)
            )
            try:
                credits_usage = CreditsUsage.model_validate(credits_usage)
            except ValueError as e:
                logger.error(f"Invalid credits usage data: {e}")
            monthly_credits_usage, prepaid_credits_usage = update_credit_usage(
                uid,
                plan,
                task_credit_cost,
                credits_usage.monthly_credits_left,
                credits_usage.prepaid_credits_left,
                credits_usage.monthly_credits_limit,
                credits_usage.prepaid_credits_limit,
            )
            monthly_credits_left = (
                credits_usage.monthly_credits_limit - monthly_credits_usage
            )
            prepaid_credits_left = (
                credits_usage.prepaid_credits_limit - prepaid_credits_usage
            )
            credits_usage = {
                "monthly_credits_left": monthly_credits_left,
                "prepaid_credits_left": prepaid_credits_left,
                "monthly_credits_limit": credits_usage.monthly_credits_limit,
                "prepaid_credits_limit": credits_usage.prepaid_credits_limit,
            }

        if not os.path.exists(local_X_raw_data_path):
            logger.warning(
                "No tweets data found. Either no tweets have been posted or scraping failed."
            )
            return None, 0, None

        utils_firebase.upload_files_to_firebase_storage(
            user_dir_name=f"{email}_{uid}",
            generation_time=current_timestamp,
            file_paths=[local_X_raw_data_path],
        )

    return local_X_raw_data_path, fb_X_raw_data_path, credits_usage


def process_summary_generation(
    uid: str,
    email: str,
    plan: str,
    local_X_raw_data_path: str,
    prompt: str,
    local_data_dir: str,
    skip_audio: bool = False,
    credits_usage: Optional[CreditsUsage] = None,
    current_timestamp: Optional[str] = None,
    model: str = "gemini-flash-latest",
):
    """Handle summary generation phase including text and transcript creation."""
    if current_timestamp is None:
        current_timestamp = datetime.now(pytz.timezone("UTC")).strftime(
            "%Y-%m-%d %H:%M:%S %Z(%z)"
        )

    # create cached content
    llm, cache, cost_tracker = create_cached_content(local_X_raw_data_path, model=model)

    # summarize data
    summary, cost_tracker_new = summarize_data(llm, prompt)
    cost_tracker = merge_cost_data(cost_tracker, cost_tracker_new)

    # generate transcript
    transcript = None
    if not skip_audio:
        transcript, cost_tracker_new = generate_transcript(llm, summary)
        cost_tracker = merge_cost_data(cost_tracker, cost_tracker_new)

    # remove the cache
    cache.delete()

    # update cost tracker
    utils_firebase.update_cost_tracker(uid, cost_tracker)

    # update credits usage
    if credits_usage is not None:
        task_credit_cost = math.ceil(
            credits_calculator.compute_summary_generation_credits_per_run()
        )
        try:
            credits_usage = CreditsUsage.model_validate(credits_usage)
        except ValueError as e:
            logger.error(f"Invalid credits usage data: {e}")
        monthly_credits_usage, prepaid_credits_usage = update_credit_usage(
            uid,
            plan,
            task_credit_cost,
            credits_usage.monthly_credits_left,
            credits_usage.prepaid_credits_left,
            credits_usage.monthly_credits_limit,
            credits_usage.prepaid_credits_limit,
        )
        monthly_credits_left = (
            credits_usage.monthly_credits_limit - monthly_credits_usage
        )
        prepaid_credits_left = (
            credits_usage.prepaid_credits_limit - prepaid_credits_usage
        )
        credits_usage = {
            "monthly_credits_left": monthly_credits_left,
            "prepaid_credits_left": prepaid_credits_left,
            "monthly_credits_limit": credits_usage.monthly_credits_limit,
            "prepaid_credits_limit": credits_usage.prepaid_credits_limit,
        }

    # save summary to file
    summary_path = os.path.join(local_data_dir, "summary.html")
    save_to_file(summary_path, summary)

    # upload summary to firebase storage
    utils_firebase.upload_files_to_firebase_storage(
        user_dir_name=f"{email}_{uid}",
        generation_time=current_timestamp,
        file_paths=[summary_path],
    )

    return summary, transcript, credits_usage


def process_audio_generation(
    uid: str,
    email: str,
    plan: str,
    transcript: str,
    local_data_dir: str,
    credits_usage: Optional[CreditsUsage] = None,
    current_timestamp: Optional[str] = None,
):
    """Handle audio generation phase including file management."""
    if current_timestamp is None:
        current_timestamp = datetime.now(pytz.timezone("UTC")).strftime(
            "%Y-%m-%d %H:%M:%S %Z(%z)"
        )

    # save transcript to file
    local_transcript_path = os.path.join(local_data_dir, "summary_transcript.txt")
    save_to_file(local_transcript_path, transcript)

    # generate unique audio file name
    random_num = str(random.randint(10000000, 99999999))
    hash_str = hashlib.sha256(random_num.encode()).hexdigest()[:8]
    audio_basename_unique = f"summary_{hash_str}.mp3"
    local_audio_path_unique = os.path.join(local_data_dir, audio_basename_unique)

    # generate audio
    success, cost_tracker = generate_audio(transcript, local_audio_path_unique)
    if not success:
        logger.error(f"Failed to generate audio for user: {email}")
        return None, None

    # update cost tracker
    utils_firebase.update_cost_tracker(uid, cost_tracker)

    # update credits usage
    if credits_usage is not None:
        task_credit_cost = math.ceil(
            credits_calculator.compute_audiogeneration_credits_per_run()
        )
        try:
            credits_usage = CreditsUsage.model_validate(credits_usage)
        except ValueError as e:
            logger.error(f"Invalid credits usage data: {e}")
        monthly_credits_usage, prepaid_credits_usage = update_credit_usage(
            uid,
            plan,
            task_credit_cost,
            credits_usage.monthly_credits_left,
            credits_usage.prepaid_credits_left,
            credits_usage.monthly_credits_limit,
            credits_usage.prepaid_credits_limit,
        )
        monthly_credits_left = (
            credits_usage.monthly_credits_limit - monthly_credits_usage
        )
        prepaid_credits_left = (
            credits_usage.prepaid_credits_limit - prepaid_credits_usage
        )
        credits_usage = {
            "monthly_credits_left": monthly_credits_left,
            "prepaid_credits_left": prepaid_credits_left,
            "monthly_credits_limit": credits_usage.monthly_credits_limit,
            "prepaid_credits_limit": credits_usage.prepaid_credits_limit,
        }

    # Clean up old audio files
    user_dir_name_fb_storage = f"{email}_{uid}"
    file_paths_in_firebase = utils_firebase.get_file_paths_in_firebase_storage_folder(
        f"users/{user_dir_name_fb_storage}/latest"
    )
    fb_old_audio_file_path = [
        path for path in file_paths_in_firebase if path.endswith(".mp3")
    ]
    for file_path in fb_old_audio_file_path:
        utils_firebase.delete_file_from_firebase_storage(uid, file_path)

    # upload files to firebase storage
    utils_firebase.upload_files_to_firebase_storage(
        user_dir_name=user_dir_name_fb_storage,
        generation_time=current_timestamp,
        file_paths=[local_transcript_path, local_audio_path_unique],
    )

    audio_url = utils_firebase.get_audio_url(
        user_dir_name_fb_storage,
        audio_basename=audio_basename_unique,
    )

    # remove local files
    os.remove(local_audio_path_unique)
    os.remove(local_transcript_path)

    return audio_url, credits_usage


def process_email_sending(uid, email, plan, newsletter_email, summary, audio_url):
    """Handle email sending phase and progress tracking."""
    if newsletter_email is None or newsletter_email == "":
        logger.warning(
            f"No newsletter email found for user: {email}. Setting it to user's email."
        )
        newsletter_email = email
    success = send_feed_summary_email(newsletter_email, summary, audio_url)
    if success:
        # update n_newsletters_sent
        n_newsletters_sent = utils_firebase.get_specific_user_data(
            uid, [f"plan_usage.{plan}.n_newsletters_sent"]
        )
        n_newsletters_sent = n_newsletters_sent.get(
            f"plan_usage.{plan}.n_newsletters_sent", 0
        )
        utils_firebase.update_data_firestore_DB(
            uid, {f"plan_usage.{plan}.n_newsletters_sent": n_newsletters_sent + 1}
        )
    else:
        logger.error(f"❌ Failed to send email for user: {email}")
    return success


def initialize_progress_tracking(uid):
    """Initialize the progress tracking dictionary for pipeline monitoring."""
    progress_data = {
        "pipeline_status": {
            "current_stage": "starting",
            "status": "in_progress",
            "error": None,
            "stages_completed": [],
            "start_time": datetime.now(pytz.timezone("UTC")).strftime(
                "%Y-%m-%d %H:%M:%S %Z(%z)"
            ),
            "end_time": None,
        }
    }
    utils_firebase.update_data_firestore_DB(uid, progress_data)
    return progress_data


def run_flow_for_user(
    uid: str,
    email: str,
    followers: list[str],
    plan: str,
    timezone: str,
    prompt: str,
    skip_scraping: bool = False,
    skip_summary: bool = False,
    skip_audio: bool = False,
    skip_email: bool = False,
    newsletter_email: Optional[str] = None,
    credits_usage: Optional[CreditsUsage] = None,
    local_data_dir: Optional[str] = None,
) -> bool:
    """Run the full pipeline and report whether every requested stage finished."""

    # Initialize progress tracking
    progress_data = initialize_progress_tracking(uid)

    # current timestamp
    current_timestamp = datetime.now(pytz.timezone("UTC")).strftime(
        "%Y-%m-%d %H:%M:%S %Z(%z)"
    )

    with tempfile.TemporaryDirectory() as tmp_local_data_dir:
        local_data_dir = local_data_dir or tmp_local_data_dir
        try:
            start_time = time.time()

            #########################################################
            # Data Collection Phase
            #########################################################
            progress_data["pipeline_status"].update(
                {"current_stage": "data_collection", "status": "in_progress"}
            )
            utils_firebase.update_data_firestore_DB(uid, progress_data)

            logger.info("Collecting data...")
            local_X_raw_data_path, fb_X_raw_data_path, credits_usage = (
                process_data_collection(
                    uid,
                    email,
                    followers,
                    plan,
                    timezone,
                    local_data_dir,
                    skip_scraping,
                    credits_usage,
                    current_timestamp,
                )
            )
            if local_X_raw_data_path is None:
                logger.error(f"No data collected for user: {email}")
                progress_data["pipeline_status"].update(
                    {"status": "error", "error": "No data collected!"}
                )
                utils_firebase.update_data_firestore_DB(uid, progress_data)
                return False

            progress_data["pipeline_status"].update({"status": "success"})
            progress_data["pipeline_status"]["stages_completed"].append(
                "data_collection"
            )
            utils_firebase.update_data_firestore_DB(uid, progress_data)

            #########################################################
            # Summarization Phase
            #########################################################
            if not skip_summary:
                progress_data["pipeline_status"].update(
                    {"current_stage": "summarization", "status": "in_progress"}
                )
                utils_firebase.update_data_firestore_DB(uid, progress_data)

                logger.info("Summarizing data...")
                summary, transcript, credits_usage = process_summary_generation(
                    uid,
                    email,
                    plan,
                    local_X_raw_data_path,
                    prompt,
                    local_data_dir,
                    skip_audio,
                    credits_usage,
                    current_timestamp,
                )

                progress_data["pipeline_status"].update({"status": "success"})
                progress_data["pipeline_status"]["stages_completed"].append("summarization")
                utils_firebase.update_data_firestore_DB(uid, progress_data)
            else:
                logger.info("Skipping summarization...")

            #########################################################
            # Audio Generation Phase
            #########################################################
            audio_url = ""
            if not skip_audio and transcript is not None:
                progress_data["pipeline_status"].update(
                    {"current_stage": "audio_generation", "status": "in_progress"}
                )
                utils_firebase.update_data_firestore_DB(uid, progress_data)

                logger.info("Generating audio...")
                audio_url, credits_usage = process_audio_generation(
                    uid,
                    email,
                    plan,
                    transcript,
                    local_data_dir,
                    credits_usage,
                    current_timestamp,
                )
                if audio_url is None:
                    logger.warning(f"Failed to generate audio for user: {email}. Continuing pipeline without audio...")
                    audio_url = ""  # Set to empty string instead of None
                    progress_data["pipeline_status"].update(
                        {"status": "warning", "error": "Audio generation failed, but summary was saved successfully"}
                    )
                    utils_firebase.update_data_firestore_DB(uid, progress_data)
                else:
                    progress_data["pipeline_status"].update({"status": "success"})

                progress_data["pipeline_status"]["stages_completed"].append(
                    "audio_generation"
                )
                utils_firebase.update_data_firestore_DB(uid, progress_data)
            else:
                logger.info("Skipping audio generation...")

            #########################################################
            # Metadata Generation Phase
            #########################################################
            logger.info("Generating metadata...")

            # log total time taken
            end_time = time.time()
            total_seconds = end_time - start_time
            minutes = int(total_seconds // 60)
            seconds = int(total_seconds % 60)
            logger.info(
                f"Total generation time: {minutes} minutes and {seconds} seconds"
            )

            # Save summary to firebase DB
            data = {
                "summary_data": {
                    "last_generation_time": current_timestamp,
                    "generation_time_seconds": total_seconds,
                    "raw_data_sources": [fb_X_raw_data_path],
                    "summary_html": summary,
                    "summary_transcript": transcript,
                    "audio_url": audio_url,
                }
            }
            utils_firebase.update_data_firestore_DB(uid, data)

            # create metadata file
            metadata_file_path = os.path.join(local_data_dir, "metadata.json")
            metadata_dict = {
                "generation_time": current_timestamp,
                "audio_url": audio_url,
                "raw_data_sources": [fb_X_raw_data_path],
                "generation_time_seconds": total_seconds,
                "accounts_X": followers,
            }
            save_metadata(metadata_file_path, metadata_dict)
            logger.debug(f"Metadata saved to: {metadata_file_path}")

            # upload metadata file to firebase storage
            utils_firebase.upload_files_to_firebase_storage(
                user_dir_name=f"{email}_{uid}",
                generation_time=current_timestamp,
                file_paths=[metadata_file_path],
            )

            logger.info(
                f"✅ Successfully ran full content generation pipeline for user: {email}"
            )

            #########################################################
            # Email Sending Phase
            #########################################################
            # send email with summary
            if not skip_email:
                progress_data["pipeline_status"].update(
                    {"current_stage": "sending_email", "status": "in_progress"}
                )
                utils_firebase.update_data_firestore_DB(uid, progress_data)

                logger.info("Sending email...")
                success = process_email_sending(
                    uid, email, plan, newsletter_email, summary, audio_url
                )
                if not success:
                    logger.error(f"Failed to send email for user: {email}")
                    progress_data["pipeline_status"].update(
                        {"status": "error", "error": "Failed to send email!"}
                    )
                    utils_firebase.update_data_firestore_DB(uid, progress_data)
                    return False

                progress_data["pipeline_status"].update({"status": "success"})
                progress_data["pipeline_status"]["stages_completed"].append(
                    "sending_email"
                )
                utils_firebase.update_data_firestore_DB(uid, progress_data)
                logger.info(f"✅ Successfully sent email to {email}")
            else:
                logger.info("Skipping email sending...")

            # Mark pipeline as complete
            end_time = datetime.now(pytz.timezone("UTC")).strftime(
                "%Y-%m-%d %H:%M:%S %Z(%z)"
            )
            progress_data["pipeline_status"].update(
                {
                    "current_stage": "completed",
                    "status": "success",
                    "end_time": end_time,
                }
            )
            utils_firebase.update_data_firestore_DB(uid, progress_data)
            logger.info(
                f"✅ Successfully completed full content generation pipeline for user: {email}"
            )
            return True

        except Exception as e:
            error_msg = f"Error for {email}: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())

            # Update progress with error
            progress_data["pipeline_status"].update(
                {
                    "status": "error",
                    "error": error_msg,
                    "end_time": datetime.now(pytz.timezone("UTC")).strftime(
                        "%Y-%m-%d %H:%M:%S %Z(%z)"
                    ),
                }
            )
            utils_firebase.update_data_firestore_DB(uid, progress_data)
            return False
