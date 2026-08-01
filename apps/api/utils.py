"""Shared utilities. Pure subset of the legacy utils.py: the Streamlit-coupled
functions (cookies, avatar, script-run-ctx threading) were removed in the
frontend rebuild; everything kept here is byte-compatible with the legacy
behavior (see docs/PLAN.md section 1.3)."""

from datetime import datetime
from functools import wraps
from threading import Thread
import logging
from logging.handlers import RotatingFileHandler
import os
import stripe
import pytz
import traceback


def run_in_thread(func):
    """
    A decorator that runs the decorated function in a separate thread.

    Args:
        func: The function to run in a separate thread

    Returns:
        wrapper: A wrapped version of the function that executes in a thread
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        thread = Thread(target=func, args=args, kwargs=kwargs)
        thread.start()
        return thread

    return wrapper


def convert_utc_to_custome_timezone(utc_time, timezone_str, show_timezone=True):
    """
    Convert UTC time to the specified timezone.

    Args:
        utc_time (str or datetime): The UTC datetime to convert (if string, format: 'YYYY-MM-DD HH:MM:SS UTC')
        timezone_str (str): Timezone string in format like 'America/New_York' or 'Europe/London'
        show_timezone (bool): Whether to show the timezone in the output string

    Returns:
        str: The converted datetime with timezone extension
    """
    try:
        # Convert string to datetime if needed
        if isinstance(utc_time, str):
            utc_time = datetime.strptime(utc_time.split(" UTC")[0], "%Y-%m-%d %H:%M:%S")

        # Create timezone object
        target_tz = pytz.timezone(timezone_str)

        # Localize the UTC time and convert to target timezone
        utc_time = pytz.utc.localize(utc_time)
        local_time = utc_time.astimezone(target_tz)

        # Format the output
        if show_timezone:
            # Get timezone abbreviation (e.g., EST, PDT)
            timezone_abbr = local_time.strftime("%Z")
            return f"{local_time.strftime('%-d %b %Y, %H:%M')} ({timezone_abbr})"
        else:
            return f"{local_time.strftime('%-d %b %Y, %H:%M')}"

    except Exception as e:
        print(f"Error converting timezone: {str(e)}")
        print(traceback.format_exc())
        return utc_time  # Return original time if conversion fails


def extract_unique_usernames_from_raw_data(text):
    # Split text by double spaces to separate posts
    posts = text.split("  ")

    # Set to store unique usernames
    usernames = set()

    # Look for usernames in each post
    for post in posts:
        if "userName:" in post:
            # Find the username part and clean it
            username_part = post.split("userName:")[1]
            # Get everything before the next field (createdAt)
            username = username_part.split("createdAt:")[0].strip()
            usernames.add(username)

    # Convert set to sorted list
    return sorted(list(usernames))


def save_to_file(file_path, content):
    with open(file_path, "w") as f:
        f.write(content)


def get_logger(name="main_logger", logs_path="logs/main.log"):
    logger = logging.getLogger(name)
    logger.handlers.clear()
    logger.propagate = False  # Prevent propagation to parent loggers
    if not logger.handlers:  # Only add handlers if none exist
        logger.setLevel(logging.DEBUG)

        # create logs directory if it doesn't exist
        os.makedirs(os.path.dirname(logs_path), exist_ok=True)

        # Create handlers
        console_handler = logging.StreamHandler()
        file_handler = RotatingFileHandler(logs_path, maxBytes=10240, backupCount=5)

        console_handler.setLevel(logging.INFO)
        file_handler.setLevel(logging.ERROR)

        # Create formatters and add it to handlers
        log_format = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        console_handler.setFormatter(log_format)
        file_handler.setFormatter(log_format)

        # Add handlers to the logger
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)
    return logger


def convert_timezone_to_utc(tz):
    """
    Convert a pytz timezone string or object to UTC offset format.

    Args:
        tz: Timezone string (e.g., "America/New_York", "Europe/London", "UTC")
            or pytz timezone object

    Returns:
        str: UTC offset string in format "UTC+HH:MM" or "UTC-HH:MM"
    """
    # If it's already in UTC+HH:MM format, return as-is
    if isinstance(tz, str) and tz.startswith("UTC"):
        return tz

    # If tz is already a timezone object, use it directly
    # Otherwise convert string to timezone object
    if hasattr(tz, 'zone'):  # Check if it's a pytz timezone object
        timezone = tz
    else:
        timezone = pytz.timezone(tz)

    offset = datetime.now(timezone).strftime("%z")
    formatted_offset = f"{offset[:3]}:00"
    return f"UTC{formatted_offset}"


def extract_number(text):
    """
    Extracts the first number found in a string.
    Example: "Add 200 Credits" -> 200
    """
    import re

    # Find all numbers in the string
    numbers = re.findall(r"\d+", text)

    # Return the first number found, or None if no numbers
    return int(numbers[0]) if numbers else None


def get_all_purchased_prepaid_credits_stripe(stripe_customer_id):

    total_credits = 0

    # Get all completed checkout sessions for this customer
    sessions = stripe.checkout.Session.list(
        customer=stripe_customer_id, status="complete", limit=100  # Adjust as needed
    )["data"]

    # Filter sessions to only include credit bundle purchases
    for session in sessions:
        if session.status == "complete" and session.payment_status == "paid":

            line_items = stripe.checkout.Session.list_line_items(
                session.id,
                limit=100,
            )

            for item in line_items.auto_paging_iter():
                product_id = item.price.product  # e.g. "prod_ABC123"

                # Retrieve the Product object to get the product name
                product = stripe.Product.retrieve(product_id)
                product_name = product.name

                purchased_credits = extract_number(product_name)
                if purchased_credits is not None:
                    total_credits += purchased_credits

    return total_credits


def compute_credit_spenditure(
    task_credit_usage, monthly_credit_left, prepaid_credits_left
):
    """
    Compute the credit spenditure for a given task

    Args:
        task_credit_usage (int): The number of credits to spend on the task
        monthly_credit_left (int): The number of credits left in the monthly limit
        prepaid_credits_left (int): The number of credits left in the prepaid credits

    Returns:
        tuple[int, int]: A tuple containing (monthly_credit_spenditure, prepaid_credit_spenditure)
    """
    if monthly_credit_left >= task_credit_usage:
        return task_credit_usage, 0
    elif monthly_credit_left + prepaid_credits_left >= task_credit_usage:
        return monthly_credit_left, prepaid_credits_left - (
            task_credit_usage - monthly_credit_left
        )
    else:
        return None, None
