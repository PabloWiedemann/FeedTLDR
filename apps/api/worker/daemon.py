from backend import utils_firebase
from utils_user import get_all_users_timezones
from dotenv import load_dotenv
import os
import traceback
import time
from datetime import datetime, timedelta
import pytz
from config.prompt_config import DEFAULT_X_PROMPT
from config.plans_config import PLAN_PROPERTIES
from utils import get_logger
from utils_user import get_user_subscription_info_from_stripe
from queue import Queue
import threading
from backend.emails_module.utils_sendgrid import send_free_plan_end_notification


load_dotenv()
# apps/api root (this file lives in worker/), so Firebase credentials resolve
# to apps/api/credentials/ exactly like the legacy repo-root gen_script.py did.
os.environ["PROJECT_DIR"] = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

from backend.run_pipeline import run_flow_for_user

# Initialize firebase client
utils_firebase.initialize_firebase_client()

# Create logger
logger = get_logger("main_logger")
logger_user_checker = get_logger("user_checker_logger")

# Initialize global queue and set for tracking users
users_queue = Queue()
users_in_queue = set()
queue_lock = threading.Lock()

# GENERATION TIME
TARGET_HOUR = 7  # 7 AM

# MINIMUM TIME BETWEEN NEWSLETTER GENERATIONS
MIN_TIME_BETWEEN_GENERATIONS = 12  # hours


def get_users_for_current_hour(users, target_hour=TARGET_HOUR):
    """Returns list of users whose target hour matches the current hour in their timezone."""
    users_to_process = []

    for user in users:
        # get user id and timezone
        user_id = user.get("uid", "unknown")

        # skip default user
        if user_id == "default_user":
            continue

        # Skip if user is already in queue
        with queue_lock:
            if user_id in users_in_queue:
                logger_user_checker.info(
                    f"Skipping user {user_id} - already in queue..."
                )
                continue

        # get user timezone
        user_tz_city = user.get("timezone", "America/New_York")
        if user_tz_city is None:
            logger_user_checker.warning(
                f"No timezone found for user {user_id}. Setting it to America/New_York"
            )
            user_tz = "America/New_York"
        user_tz = pytz.timezone(user_tz_city)

        # get current time in user's timezone
        user_current_time = datetime.now(user_tz)

        if user_current_time.hour == target_hour:
            # get user data
            user_data = utils_firebase.get_specific_user_data(
                user_id,
                ["plan", "email", "summary_data.newsletter_last_generation_time"],
            )
            plan = user_data.get("plan", "free")
            email = user_data.get("email", "unknown")
            newsletter_last_generation_time = user_data.get(
                "summary_data.newsletter_last_generation_time", None
            )

            # skip if newsletter was generated in the last 24 hours
            if newsletter_last_generation_time is not None:
                generation_time = datetime.strptime(
                    newsletter_last_generation_time, "%Y-%m-%d %H:%M:%S %Z(%z)"
                ).astimezone(user_tz)
                if datetime.now(user_tz) - generation_time < timedelta(
                    hours=MIN_TIME_BETWEEN_GENERATIONS
                ):
                    logger_user_checker.info(
                        f"Skipping user id {user_id} with email {email} because newsletter was generated in the last {MIN_TIME_BETWEEN_GENERATIONS} hours..."
                    )
                    continue

            # skip if free trial is over
            if plan == "free":
                n_newsletters_sent = utils_firebase.get_specific_user_data(
                    user_id, ["plan_usage.free.n_newsletters_sent"]
                )
                n_newsletters_sent = n_newsletters_sent.get(
                    "plan_usage.free.n_newsletters_sent", 0
                )
                max_newsletters = PLAN_PROPERTIES["free"]["limits"][
                    "max_newsletters_sent"
                ]
                if n_newsletters_sent >= max_newsletters:
                    free_plan_end_notification_sent = utils_firebase.get_specific_user_data(
                        user_id, ["free_plan_end_email_notification_sent"]
                    ).get("free_plan_end_email_notification_sent", False)
                    if free_plan_end_notification_sent is None or not free_plan_end_notification_sent:
                        success = send_free_plan_end_notification(email)
                        if success:
                            utils_firebase.update_data_firestore_DB(
                                user_id,
                                {"free_plan_end_email_notification_sent": True}
                            )
                    logger_user_checker.info(
                        f"Skipping user id {user_id} with email {email} because free trial is over..."
                    )
                    continue

            # skip weekends
            if user_current_time.weekday() >= 5:
                logger_user_checker.info(
                    f"Skipping user id {user_id} with email {email} because it's a weekend..."
                )
                continue

            # get rest of user data
            user_data = utils_firebase.get_specific_user_data(
                user_id,
                [
                    "settings_X.accounts",
                    "settings_X.verified_accounts",
                    "settings_global.ai_prompt",
                    "settings_global.newsletter_email",
                ],
            )
            user_data["plan"] = plan
            user_data["uid"] = user_id
            user_data["email"] = email
            user_data["timezone"] = user_tz

            # add user to list
            users_to_process.append(user_data)

    return users_to_process


def check_and_add_users():
    """Thread function to check for users and add them to queue."""
    while True:
        users = get_all_users_timezones()
        users_for_current_hour = get_users_for_current_hour(users, TARGET_HOUR)

        if len(users_for_current_hour) > 0:
            logger_user_checker.info(
                f"Adding {len(users_for_current_hour)} users to queue"
            )
            with queue_lock:
                for user in users_for_current_hour:
                    users_queue.put(user)
                    users_in_queue.add(user["uid"])
        else:
            # Sleep until next hour
            next_hour = (datetime.now() + timedelta(hours=1)).replace(
                minute=0, second=0, microsecond=0
            )
            sleep_seconds = (next_hour - datetime.now()).total_seconds()
            logger_user_checker.info(
                f"No users to process at current hour. Sleeping for {sleep_seconds} seconds..."
            )
            time.sleep(sleep_seconds)


def handle_plan_reset(user_id, email, current_date, timezone, plan_info):
    """
    Handles plan reset logic for a user's subscription.
    Returns True if processing should continue, False if it should stop.
    """
    plan_end_date = datetime.fromtimestamp(
        plan_info.get("current_period_end"), timezone
    )
    plan_start_date = datetime.fromtimestamp(
        plan_info.get("current_period_start"), timezone
    )
    plan_cancel_at_end_date = plan_info.get("cancel_at_period_end", False)

    # check if plan needs to be reset to 'free' plan
    is_expired = current_date >= plan_end_date and plan_cancel_at_end_date
    if is_expired:
        utils_firebase.reset_all_plans_usage(user_id)
        utils_firebase.update_data_firestore_DB(user_id, {"plan": "free"})
        logger.info(f"Changed plan to 'free' for user {email}")
        return False

    # Calculate the reset day, handling edge cases for months with fewer days
    reset_day = min(
        plan_start_date.day,
        (current_date.replace(day=1) + timedelta(days=32)).replace(day=1).day - 1,
    )

    # Reset if we're on the reset day of the month
    if (
        (current_date.day == reset_day and current_date.month != plan_start_date.month)
        or current_date.year != plan_start_date.year
    ):
        utils_firebase.reset_all_plans_usage(user_id)
        logger.info(f"Reset all plans usage for user {email}")

    return True


def run_script_for_user(user):
    try:

        # get user data
        user_id = user["uid"]
        email = user["email"]
        plan = user["plan"]
        timezone = user["timezone"]
        accounts_X = user.get("settings_X.accounts", None)
        verified_accounts_X = user.get("settings_X.verified_accounts", None)
        ai_prompt = user.get("settings_global.ai_prompt", None)
        newsletter_email = user.get("settings_global.newsletter_email", None)
        logger.info(
            f"Starting newsletter generation for user id {user_id} with email {email}"
        )

        # handle missing inputs
        if accounts_X is None or len(accounts_X) == 0:
            logger.warning(
                f"No follower accounts found for user id {user_id} with email {email}. Skipping..."
            )
            return
        if ai_prompt is None or ai_prompt == "":
            logger.warning(
                f"No AI prompt found for user id {user_id} with email {email}. Setting it to default prompt."
            )
            ai_prompt = DEFAULT_X_PROMPT
        if newsletter_email is None or newsletter_email == "":
            logger.warning(
                f"No newsletter email found for user id {user_id} with email {email}. Skipping..."
            )
            return
        if verified_accounts_X is None or len(verified_accounts_X) == 0:
            logger.warning(
                f"No verified accounts found for user id {user_id} with email {email}. Skipping..."
            )
            return

        # get current date in the given timezone
        current_date = datetime.now(timezone)

        # Reset all plans usage if it's the first day of the month
        if plan not in ["free", "admin"]:
            # get plan dates data
            plan_info = get_user_subscription_info_from_stripe(email)
            if not handle_plan_reset(user_id, email, current_date, timezone, plan_info):
                return

        # run flow for user
        run_flow_for_user(
            uid=user_id,
            email=email,
            followers=accounts_X,
            plan=plan,
            timezone=timezone,
            prompt=ai_prompt,
            skip_scraping=False,
            skip_audio=False,
            skip_email=False,
            newsletter_email=newsletter_email,
            credits_usage=None,
        )
        logger.info(f"Successfully generated content for user {email}")
        logger.info("")

        # record time of generation
        current_date_utc = current_date.astimezone(pytz.timezone("UTC")).strftime(
            "%Y-%m-%d %H:%M:%S %Z(%z)"
        )
        utils_firebase.update_data_firestore_DB(
            user_id, {"summary_data.newsletter_last_generation_time": current_date_utc}
        )

    except Exception as e:
        logger.error(f"Error for user {user['email']}: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.info("")


def process_users():
    """Thread function to process users from queue."""
    while True:
        if not users_queue.empty():
            user = users_queue.get()
            with queue_lock:
                users_in_queue.remove(user["uid"])  # Remove user from tracking set
            run_script_for_user(user)
            users_queue.task_done()

            # sleep for 1 minute
            sleep_time = 10
            logger.info(f"Sleeping for {sleep_time} seconds before next user...")
            time.sleep(sleep_time)
        else:
            # Sleep until next hour
            next_hour = (datetime.now() + timedelta(hours=1)).replace(
                minute=0, second=0, microsecond=0
            )
            sleep_seconds = (next_hour - datetime.now()).total_seconds() + 60
            logger.info(f"No users in queue, waiting for {sleep_seconds} seconds...")
            time.sleep(sleep_seconds)


def main():  # 7 AM
    # Create and start threads
    checker_thread = threading.Thread(target=check_and_add_users, daemon=True)
    processor_thread = threading.Thread(target=process_users, daemon=True)

    checker_thread.start()
    time.sleep(10)
    processor_thread.start()

    # Keep main thread alive
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        logger.info("Shutting down...")


if __name__ == "__main__":
    main()
