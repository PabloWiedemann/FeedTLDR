import os
from firebase_admin import storage, auth, firestore, credentials
import firebase_admin
from dotenv import load_dotenv
from utils import get_logger
import traceback
from icecream import ic
import pytz
from datetime import datetime
import math

logger = get_logger("main_logger")
load_dotenv()

FIREBASE_WEB_API_KEY = os.environ.get("FIREBASE_WEB_API_KEY")

current_file_dir = os.path.dirname(os.path.abspath(__file__))


def initialize_firebase_client(project_dir=None):
    """Initialize Firebase Admin SDK."""
    # credentials_file = "/etc/secrets/firebase_credentials_secret_prod.json"
    if project_dir is None:
        PROJECT_DIR = os.environ.get("PROJECT_DIR")
    else:
        PROJECT_DIR = project_dir
    if os.environ.get("CREDENTIALS_DIR") is not None:
        credentials_dir = os.environ.get("CREDENTIALS_DIR")
    else:
        credentials_dir = "credentials"
    credentials_file_path = os.path.join(PROJECT_DIR, credentials_dir, "firebase_credentials_secret_prod.json")

    try:
        if not os.path.exists(credentials_file_path):
            logger.error(f"❌ Credentials file not found: {credentials_file_path}")
            raise FileNotFoundError(f"Credentials directory not found: {credentials_file_path}")
        
        cred = credentials.Certificate(credentials_file_path)
        
        firebase_admin.initialize_app(
            cred,
            {
                "databaseURL": "https://feedtldr-default-rtdb.firebaseio.com/",
                "storageBucket": "feedtldr.firebasestorage.app",
            },
        )
    except ValueError as e:
        if "The default Firebase app already exists." in str(e):
            pass  # App is already initialized
        else:
            logger.error(f"❌ Error initializing Firebase client: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")


# =======================================================================
# Firebase Auth DB
# =======================================================================
def uid_email_verification(uid, email):
    """Verify stored credentials with Firebase Auth."""
    # Check if we have user credentials in local storage
    initialize_firebase_client()
    try:
        # Try to get the user from Firebase Auth
        user = auth.get_user(uid)

        # Verify the email matches
        if user.email == email:
            print(f"✅ User authenticated: {email}")
            return True
        else:
            print("❌ Email mismatch in stored credentials")
            return False

    except auth.UserNotFoundError:
        print(f"❌ User not found in Firebase: {uid}")
        return False

    except Exception as e:
        print(f"❌ Error checking auth status: {str(e)}")
        return False


# =======================================================================
# Firebase Storage
# =======================================================================


def upload_files_to_firebase_storage(
    user_dir_name: str, generation_time: str, file_paths: list[str]
):
    """
    Uploads files to Firebase Storage in two locations: latest and historical.

    Latest files are stored in 'users/{email}_{uid}/latest/' and will be overwritten on each upload.
    Historical files are stored in 'users/{email}_{uid}/history/{generation_time}/' for version tracking.

    Args:
        uid (str): User's unique identifier
        email (str): User's email address
        generation_time (str): Timestamp of when the files were generated
    """
    upload_success = True
    try:
        bucket = storage.bucket()

        # # create the metadata json file
        # metadata_dict = {"gen_time": generation_time}
        # metadata_file = os.path.join(output_dir, "metadata.json")
        # save_metadata(metadata_file, metadata_dict)

        # Files to upload
        files_to_upload = {}
        for file_path in file_paths:
            file_name = os.path.basename(file_path)
            files_to_upload[file_name] = file_path

        # Define target paths in firebase
        latest_base_path = f"users/{user_dir_name}/latest"
        historical_base_path = f"users/{user_dir_name}/history/{generation_time}"

        # Upload each file
        for file_name, file_path in files_to_upload.items():
            if os.path.exists(file_path):
                # Upload to 'latest' folder
                latest_path = f"{latest_base_path}/{file_name}"
                latest_blob = bucket.blob(latest_path)
                latest_blob.upload_from_filename(file_path)

                # Upload to historical folder
                # Skip historical upload for audio files
                if not file_name.endswith('.mp3'):
                    historical_path = f"{historical_base_path}/{file_name}"
                    historical_blob = bucket.blob(historical_path)
                    historical_blob.upload_from_filename(file_path)

                logger.debug(
                    f"Uploaded {file_name} to both latest and historical paths"
                )
            else:
                logger.error(f"File not found: {file_path}")
                upload_success = False

    except Exception as e:
        logger.error(f"Error occurred during upload: {str(e)}")
        logger.error(f"Error uploading files to Firebase for {user_dir_name}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        upload_success = False

    if upload_success:
        logger.info("✅ All files uploaded successfully")
    else:
        logger.error("❌ Some files failed to upload")


def get_audio_url(user_dir_name: str, audio_basename: str = "summary.mp3") -> str:
    """
    Creates and returns a public URL for the user's audio file in Firebase Storage.

    Args:
        user_dir_name (str): User's directory name
        audio_basename (str): Name of the audio file in Firebase Storage

    Returns:
        str: Public URL of the audio file if found, empty string if not found
    """
    try:
        bucket = storage.bucket()

        # Define path to audio file in Firebase
        audio_path = f"users/{user_dir_name}/latest/{audio_basename}"

        # Get blob reference
        blob = bucket.blob(audio_path)

        # Check if file exists
        if blob.exists():
            # Make blob public and get URL
            blob.make_public()
            logger.info(f"✅ Successfully retrieved audio URL: {blob.public_url}")
            return blob.public_url
        else:
            logger.info(f"❌ No audio file found at path: {audio_path}")
            return ""

    except Exception as e:
        logger.error(f"❌ Error getting audio URL: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return ""


def get_file_paths_in_firebase_storage_folder(folder_path: str) -> list[str]:
    """
    Returns a list of all file paths within a specified folder in Firebase Storage.

    Args:
        folder_path (str): Path to the folder in Firebase Storage

    Returns:
        list[str]: List of file paths found in the folder, empty list if folder not found or error occurs
    """
    try:
        bucket = storage.bucket()

        # List all blobs with the folder prefix
        blobs = bucket.list_blobs(prefix=folder_path)

        # Get file paths, excluding the folder itself
        file_paths = []
        for blob in blobs:
            # Skip if this is a directory (name ends with /)
            if not blob.name.endswith("/"):
                file_paths.append(blob.name)

        logger.debug(
            f"✅ Successfully retrieved {len(file_paths)} file paths from {folder_path}"
        )
        return file_paths

    except Exception as e:
        logger.error(f"❌ Error listing files in folder {folder_path}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return []


def check_if_file_exists_in_firebase_storage(fb_file_path: str) -> bool:
    """
    Checks if a specific file exists in Firebase Storage.

    Args:
        fb_file_path (str): Path to the file in Firebase Storage
    """
    try:
        bucket = storage.bucket()
        blob = bucket.blob(fb_file_path)
        return blob.exists()
    except Exception as e:
        logger.error(f"❌ Error checking if file exists in Firebase: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False


def download_file_from_firebase_storage(
    fb_file_path: str, output_file_path: str
) -> tuple[bool, str]:
    """
    Downloads a specific file from Firebase Storage to a local directory.

    Args:
        fb_file_path (str): Path to the file in Firebase Storage
        output_dir (str): Path to the local directory where the file will be saved
    """
    try:
        bucket = storage.bucket()
        blob = bucket.blob(fb_file_path)
        blob.download_to_filename(output_file_path)
        return True, blob.public_url
    except Exception as e:
        logger.error(f"❌ Error downloading file from Firebase: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False, ""


def download_latest_files_from_firebase_storage(
    data_dir_name: str, email: str, download_audio: str = False
) -> tuple[bool, str]:
    """
    Downloads all files from Firebase Storage 'latest' directory to local storage.

    Args:
        data_dir_name (str): User's unique data directory identifier
        email (str): User's email address

    Returns:
        tuple[bool, str]: (success status, audio public URL if exists, empty string if not)
    """
    try:
        bucket = storage.bucket()
        audio_url = ""

        # Setup local directories
        data_dir = os.path.join(current_file_dir, "data", email)
        output_dir = os.path.join(data_dir, "outputs")
        os.makedirs(output_dir, exist_ok=True)

        # Define the base path in Firebase
        latest_base_path = f"users/{data_dir_name}/latest"

        # List all files in the latest directory
        blobs = bucket.list_blobs(prefix=latest_base_path)

        # Track if we found and downloaded any files
        files_downloaded = False

        # Download each file
        for blob in blobs:
            # Get the filename from the full path
            file_name = os.path.basename(blob.name)
            if not file_name:  # Skip if this is a directory
                continue

            # Set up local file path
            local_file_path = os.path.join(output_dir, file_name)

            # If this is the audio file, make it public and get URL
            if file_name.endswith(".mp3"):
                blob.make_public()
                audio_url = blob.public_url
                if not download_audio:
                    continue

            # Download the file
            blob.download_to_filename(local_file_path)
            print(f"✅ Downloaded {file_name}")
            files_downloaded = True

        if not files_downloaded:
            print("❌ No files found in the latest directory")
            return False, ""

        print("✅ All files downloaded successfully")
        return True, audio_url

    except Exception as e:
        print(f"❌ Error downloading files from Firebase: {str(e)}")
        return False, ""


def get_file_from_firebase_storage(
    user_dir_name: str, file_name: str
) -> tuple[bool, str]:
    """
    >> For text files (HTML, TXT, JSON) <<
    Downloads a specific file from Firebase Storage directly into memory.

    Args:
        user_dir_name (str): User's directory identifier
        file_name (str): Name of the file to download (e.g., 'summary.html')

    Returns:
        tuple[bool, str]: (success status, file contents as string)
    """
    try:
        bucket = storage.bucket()

        # Define the file path in Firebase
        file_path = f"users/{user_dir_name}/latest/{file_name}"

        # Get blob reference
        blob = bucket.blob(file_path)

        # Check if file exists
        if not blob.exists():
            print(f"❌ File not found: {file_path}")
            return False, ""

        # Download into memory
        content = blob.download_as_string().decode("utf-8")
        print(f"✅ Successfully downloaded {file_name}")
        return True, content

    except Exception as e:
        print(f"❌ Error downloading file from Firebase: {str(e)}")
        return False, ""


def download_raw_X_data_from_firestore(
    fb_X_raw_data_path: str, local_X_raw_data_path: str
):
    """
    Downloads the default raw data from Firestore for a given user.

    Args:
        email (str): User's email address
        X_raw_data_basename (str): Name of the raw data file
        local_X_raw_data_path (str): Path to save the downloaded file

    Returns:
        tuple[bool, str]: (success status, file contents as string)
    """
    raw_data_exists_in_fb = check_if_file_exists_in_firebase_storage(fb_X_raw_data_path)
    if not raw_data_exists_in_fb:
        logger.warning("No raw X data found in Firebase for user.")
        logger.info("Downloading default scraped tweets data from firestore...")
        fb_X_raw_data_path = os.path.join(
            "users", "default", "latest", "raw_scraped_tweets.csv"
        )

    success, _ = download_file_from_firebase_storage(
        fb_X_raw_data_path, local_X_raw_data_path
    )
    return success


# =======================================================================
# Firestore DB
# =======================================================================
def get_all_users_data() -> list[dict]:
    """
    Fetches all users data from Firestore.
    """
    firestore_db = firestore.client()
    customers_docs = firestore_db.collection("customers").get()
    return [{"user_id": doc.id, **doc.to_dict()} for doc in customers_docs]


def get_specific_user_data(uid: str, fields: list[str]) -> dict:
    """
    Fetches specific user data fields from Firestore.

    Args:
        uid (str): User's unique identifier
        fields: List of field paths to fetch. Can include nested paths using dots.
                e.g. ['email', 'settings_global.timezone', 'summary_data.audio_url']

    Returns:
        dict: Dictionary containing requested fields, or None if error occurs
    """
    try:
        # Get reference to Firestore database
        firestore_db = firestore.client()

        # Get reference to user document
        customer_doc_ref = firestore_db.collection("customers").document(uid)

        # Get the document with specific fields
        customer_doc = customer_doc_ref.get(field_paths=fields)

        if not customer_doc.exists:
            logger.error("❌ Missing customer document")
            return None

        customer_data = customer_doc.to_dict()
        result = {}

        # Process each requested field
        for field in fields:
            if "." in field:
                # Handle nested fields (e.g., 'settings_global.timezone')
                parts = field.split(".")
                value = customer_data
                for part in parts:
                    value = value.get(part, {}) if value else None
                result[field] = value
            else:
                # Handle top-level fields
                result[field] = customer_data.get(field)

        logger.debug(f"✅ Successfully fetched data for user {uid}")

        return result

    except Exception as e:
        logger.error(f"❌ Error fetching data: {str(e)}")
        return None


def update_data_firestore_DB(uid: str, data: dict):
    """
    Updates user data in Firestore database, preserving nested structure.
    Supports dot notation for updating nested fields.

    Args:
        uid (str): User's unique identifier
        data (dict): Dictionary containing data to update. Can use dot notation for nested fields.
                    Example: {'settings_global.ai_prompt': 'new prompt'}
                    or: {'settings_global': {'ai_prompt': 'new prompt'}}

    Returns:
        None
    """
    try:
        # Get reference to Firestore database
        firestore_db = firestore.client()
        user_doc_ref = firestore_db.collection("customers").document(uid)

        # Convert nested dict structure to dot notation if needed
        flattened_updates = {}
        for key, value in data.items():
            if isinstance(value, dict):
                for nested_key, nested_value in value.items():
                    flat_key = f"{key}.{nested_key}"
                    flattened_updates[flat_key] = nested_value
            else:
                flattened_updates[key] = value

        # Update the document with the flattened structure
        user_doc_ref.update(flattened_updates)
        logger.debug("✅ Successfully saved/updated settings")
        return True

    except Exception as e:
        logger.error(f"❌ Error saving settings: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False


def merge_cost_data(current: dict, new: dict) -> dict:
    """Recursively merges two cost dictionaries, summing leaf nodes with matching paths."""
    merged = {}

    # Process all keys from current dict
    for key, current_value in current.items():
        if key in new:
            # If both are dicts, recurse
            if isinstance(current_value, dict) and isinstance(new[key], dict):
                merged[key] = merge_cost_data(current_value, new[key])
            # If both are numbers, sum them
            elif isinstance(current_value, (int, float)) and isinstance(
                new[key], (int, float)
            ):
                merged[key] = current_value + new[key]
            # If types don't match, keep current value
            else:
                merged[key] = current_value
        else:
            # Key only in current, keep it
            merged[key] = current_value

    # Add keys that are only in new dict
    for key, new_value in new.items():
        if key not in current:
            merged[key] = new_value

    return merged


def update_cost_tracker(uid: str, usage_cost_tracker_data: dict):
    """
    Updates the cost tracker for a given user in Firestore by merging and summing costs.

    Args:
        uid (str): User's unique identifier
        scraper_name (str): Name of the scraper (e.g., 'twitter_scraper')
        usage_cost_tracker_data (dict): New cost data to be merged

    Returns:
        bool: True if update successful, False otherwise
    """
    try:
        # Get current cost data
        current_cost_data = get_specific_user_data(uid, ["cost_tracker"])
        if not current_cost_data or "cost_tracker" not in current_cost_data:
            current_cost_data = {}
        elif current_cost_data["cost_tracker"] is None:
            current_cost_data = {}
        else:
            current_cost_data = current_cost_data["cost_tracker"]

        # Merge the cost data
        new_cost_data = merge_cost_data(current_cost_data, usage_cost_tracker_data)

        # Update in Firestore with the merged data
        update_data = {"cost_tracker": new_cost_data}

        success = update_data_firestore_DB(uid, update_data)
        if success:
            logger.debug("✅ Successfully updated cost tracker")
            return True
        else:
            logger.error("❌ Failed to update cost tracker")
            return False

    except Exception as e:
        logger.error(f"❌ Error updating cost tracker: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False


def fetch_subscription_status(uid):
    """
    Fetches the subscription status for a given user from Firestore.

    Args:
        uid (str): User's unique identifier

    Returns:
        bool: True if user has an active subscription, False otherwise
    """
    try:
        # Initialize Firestore client
        firestore_db = firestore.client()

        # Get reference to customer document and subscriptions collection
        customer_doc_ref = firestore_db.collection("customers").document(uid)
        subscriptions_ref = customer_doc_ref.collection("subscriptions")

        # Get first subscription document
        subscription_docs = subscriptions_ref.stream()
        first_subscription = next(subscription_docs, None)

        if first_subscription:
            status = first_subscription.to_dict().get("status")
            return status in ["active", "trialing"]

        return False

    except Exception as e:
        print(f"❌ Error fetching subscription status: {str(e)}")
        return False


def fetch_subscription_info(uid, subscription_id=None):
    """
    Fetches the subscription info for a given user from Firestore.

    Args:
        uid (str): User's unique identifier

    Returns:
        dict: Dictionary containing subscription info with default empty values
    """
    data = {
        "status": "",
        "plan_period": "",
        "plan_name": "free",
        "plan_price": 0,
        "plan_start_date": None,
        "plan_end_date": None,
        "plan_status": None,
        "plan_termination": False,
    }

    try:
        firestore_db = firestore.client()
        customer_doc_ref = firestore_db.collection("customers").document(uid)
        subscriptions_ref = customer_doc_ref.collection("subscriptions")

        if subscription_id:
            subscription_ref = subscriptions_ref.document(subscription_id)
            subscription_data = subscription_ref.get().to_dict()
        else:
            first_subscription = next(subscriptions_ref.stream(), None)

        if not first_subscription:
            ic(f"No subscription found for user {uid} - using free plan")
            return data

        subscription_data = first_subscription.to_dict()
        items = subscription_data.get("items", [])

        if not items:
            return data

        price = items[0].get("price", {})
        data.update(
            {
                "plan_name": price.get("product", {}).get("name", ""),
                "plan_price": price.get("unit_amount", 0),
                "plan_period": price.get("recurring", {}).get("interval", ""),
                "plan_status": price.get("active", None),
                "plan_termination": subscription_data.get(
                    "cancel_at_period_end", False
                ),
                "plan_start_date": subscription_data.get("current_period_start", None),
                "plan_end_date": subscription_data.get("current_period_end", None),
            }
        )

        return data

    except Exception as e:
        ic(f"❌ Error fetching subscription info: {str(e)}")
        return data


def sync_subscription_plan(uid: str) -> bool:
    """
    Syncs the subscription plan with the customer's plan property.
    If subscription is active, updates plan to match subscription product name.
    If no active subscription, sets plan to 'free'.

    Args:
        uid (str): User's unique identifier

    Returns:
        bool: True if sync was successful or no sync needed, False if error occurred
    """
    try:
        # Initialize Firestore client
        firestore_db = firestore.client()
        customer_doc_ref = firestore_db.collection("customers").document(uid)

        # Get current customer plan
        customer_doc = customer_doc_ref.get()
        if not customer_doc.exists:
            logger.error(f"Customer document not found for uid: {uid}")
            return False

        current_plan = customer_doc.to_dict().get("plan", "free")

        # check if its admin
        if current_plan == "admin":
            return True

        # Get subscription info
        subscriptions_ref = customer_doc_ref.collection("subscriptions")
        first_subscription = next(subscriptions_ref.stream(), None)

        if not first_subscription:
            # No subscription found - set to free if not already
            if current_plan != "free":
                customer_doc_ref.update({"plan": "free"})
                logger.info(f"Updated plan to 'free' for user {uid}")
            return True

        subscription_data = first_subscription.to_dict()
        subscription_status = subscription_data.get("status")
        current_period_end = subscription_data.get("current_period_end", None)

        # Check if subscription has expired
        if current_period_end:
            current_timestamp = datetime.now(pytz.UTC)
            current_period_end_datetime = datetime.fromtimestamp(
                current_period_end, pytz.UTC
            )
            is_expired = current_timestamp > current_period_end_datetime
            if is_expired:
                logger.info(
                    f"Subscription expired for user {uid}. Setting plan to 'free'"
                )
                customer_doc_ref.update({"plan": "free"})
                return True

        # Get product name from subscription
        items = subscription_data.get("items", [])
        if not items:
            logger.error(f"No items found in subscription for user {uid}")
            return False

        product_name = items[0].get("price", {}).get("name")

        if not product_name:
            logger.error(f"No product name found in subscription for user {uid}")
            return False

        # Update plan if needed
        if subscription_status in ["active", "trialing"]:
            if current_plan != product_name:
                customer_doc_ref.update({"plan": product_name})
                logger.info(
                    f"Updated plan from '{current_plan}' to '{product_name}' for user {uid}"
                )

        return True

    except Exception as e:
        logger.error(f"Error syncing subscription plan: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False


def fetch_subscription_period(uid):
    """
    Fetches the subscription period (month/year) for a given user from Firestore.

    Args:
        uid (str): User's unique identifier

    Returns:
        str: Subscription period ('month' or 'year') if found, False otherwise
    """
    try:
        # Initialize Firestore client
        firestore_db = firestore.client()

        # Get reference to customer document and subscriptions collection
        customer_doc_ref = firestore_db.collection("customers").document(uid)
        subscriptions_ref = customer_doc_ref.collection("subscriptions")

        # Get first subscription document
        subscription_docs = subscriptions_ref.stream()
        first_subscription = next(subscription_docs, None)

        if first_subscription:
            subscription_data = first_subscription.to_dict()
            items = subscription_data.get("items", [])
            if items and len(items) > 0:
                plan = items[0].get("plan", {})
                return plan.get("interval", False)

        return False

    except Exception as e:
        print(f"❌ Error fetching subscription period: {str(e)}")
        return False


def fetch_subscription_termination(uid):
    """
    Fetches the subscription status for a given user from Firestore.

    Args:
        uid (str): User's unique identifier

    Returns:
        bool: True if user has an active subscription, False otherwise
    """
    try:
        # Initialize Firestore client
        firestore_db = firestore.client()

        # Get reference to customer document and subscriptions collection
        customer_doc_ref = firestore_db.collection("customers").document(uid)
        subscriptions_ref = customer_doc_ref.collection("subscriptions")

        # Get first subscription document
        subscription_docs = subscriptions_ref.stream()
        first_subscription = next(subscription_docs, None)

        if first_subscription:
            terminated = first_subscription.to_dict().get("cancel_at_period_end")
            if terminated:
                end_date = first_subscription.to_dict().get("current_period_end")

            return end_date

        return None

    except Exception as e:
        print(f"❌ Error fetching subscription status: {str(e)}")
        return None


def fetch_plan_usage_data(uid: str):
    """
    Fetches the plan usage data for a given user from Firestore.
    """
    try:
        firestore_db = firestore.client()
        user_doc = firestore_db.collection("customers").document(uid).get()
        return user_doc.to_dict().get("plan_usage", {})
    except Exception as e:
        print(f"❌ Error fetching plan usage data: {str(e)}")
        return {}


def update_usage(uid: str, item_update: dict, current_plan: str):
    """
    Updates usage statistics for a specific plan and resets others to zero.

    Args:
        uid (str): The ID of the user whose usage needs to be updated
        item_update (dict): Dictionary containing the item key and new value (e.g., {'n_generations': 5})
        current_plan (str): The name of the user's current plan

    Returns:
        Dict[str, Any]: The updated plan dictionary

    Raises:
        UsageUpdateError: If there's an error updating the usage in Firebase
    """
    # Initialize Firestore client
    firestore_db = firestore.client()

    # Get reference to customer document and subscriptions collection
    customer_doc_ref = firestore_db.collection("customers").document(uid)

    try:
        # Get the current plan dictionary
        user_doc = customer_doc_ref.get()
        if not user_doc.exists:
            return None

        user_data = user_doc.to_dict()
        plan_usage = user_data.get("plan_usage", {})

        # Validate the current plan exists
        if current_plan not in plan_usage:
            return None

        # Get the item key and value from the update dictionary
        if not item_update or len(item_update) != 1:
            print("❌ Invalid item_update dictionary format")
            return None

        item_key = list(item_update.keys())[0]
        new_item_value = item_update[item_key]

        # Create updated plan dictionary
        updated_plan_dict = {}

        # Update each plan
        for plan_name, plan_data in plan_usage.items():
            # Create a new plan data dictionary
            updated_plan_data = {}

            # Update values based on whether this is the current plan
            for key in plan_data.keys():
                if plan_name == current_plan:
                    if key == item_key:
                        updated_plan_data[key] = new_item_value  # change to new value
                    else:
                        updated_plan_data[key] = plan_data[key]  # keep old value
                else:
                    updated_plan_data[key] = 0  # for other plans, reset to 0

            updated_plan_dict[plan_name] = updated_plan_data

        # Update in Firebase using a transaction to ensure atomicity
        @firestore.transactional
        def update_transaction(transaction, user_ref, updated_dict):
            transaction.update(user_ref, {"plan_usage": updated_dict})

        transaction = firestore_db.transaction()
        update_transaction(transaction, customer_doc_ref, updated_plan_dict)

        return updated_plan_dict

    except Exception as e:
        print(f"❌ Error updating usage: {str(e)}")
        return None


# ---------------- Delete user from Firebase ----------------
def delete_user_from_firebase(uid: str):
    delete_user_from_firebase_auth(uid)
    delete_user_from_firestore(uid)


def delete_user_from_firebase_auth(uid: str):
    try:
        initialize_firebase_client()
        auth.delete_user(uid)
        print(f"✅ Successfully deleted user {uid} from Firebase Auth")
        return True
    except Exception as e:
        traceback.print_exc()
        print(f"❌ Error deleting user {uid} from Firebase Auth: {str(e)}")
        return False


def delete_user_from_firestore(uid: str):
    try:
        firestore_db = firestore.client()
        customer_doc_ref = firestore_db.collection("customers").document(uid)
        customer_doc_ref.delete()
        print(f"✅ Successfully deleted user {uid} from Firestore")
        return True
    except Exception as e:
        traceback.print_exc()
        print(f"❌ Error deleting user {uid} from Firebase Auth: {str(e)}")
        return False


def delete_file_from_firebase_storage(uid: str, file_path: str):
    try:
        bucket = storage.bucket()
        blob = bucket.blob(file_path)
        blob.delete()
        print(f"✅ Successfully deleted file from Firebase Storage: {file_path}")
        return True
    except Exception as e:
        print(f"❌ Error deleting file from Firebase Storage: {str(e)}")
        return False


# ---------------- Reset all plans usage ----------------


def reset_all_plans_usage(uid: str) -> bool:
    """
    Resets all usage statistics to zero for all plans.

    Args:
        uid (str): The ID of the user whose usage needs to be reset

    Returns:
        bool: True if reset was successful, False otherwise
    """
    try:
        # Initialize Firestore client
        firestore_db = firestore.client()
        customer_doc_ref = firestore_db.collection("customers").document(uid)

        # Get the current plan dictionary
        user_doc = customer_doc_ref.get()
        if not user_doc.exists:
            print(f"❌ User document not found for uid: {uid}")
            return False

        user_data = user_doc.to_dict()
        plan_usage = user_data.get("plan_usage", {})
        print(f"Plan usage: {plan_usage}")
        # Create reset plan dictionary
        reset_plan_dict = {}

        # Reset all values to 0 for each plan
        for plan_name, plan_data in plan_usage.items():
            reset_plan_dict[plan_name] = {key: 0 for key in plan_data.keys()}

        # Update in Firebase using a transaction to ensure atomicity
        @firestore.transactional
        def update_transaction(transaction, user_ref, updated_dict):
            transaction.update(user_ref, {"plan_usage": updated_dict})

        transaction = firestore_db.transaction()
        print(f"Reset plan usage: {reset_plan_dict}")
        update_transaction(transaction, customer_doc_ref, reset_plan_dict)

        print(f"✅ Successfully reset all plan usage data for user {uid}")
        return True

    except Exception as e:
        print(f"❌ Error resetting plan usage: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return False


def compute_credits_left(
    uid: str, plan: str, monthly_credits_limit: int, prepaid_credits_limit: int
):
    current_monthly_credits, current_prepaid_credits = list(
        get_specific_user_data(
            uid,
            [f"plan_usage.{plan}.n_credits", "n_prepaid_credits"],
        ).values()
    )
    if current_monthly_credits is None:
        current_monthly_credits = 0
    if current_prepaid_credits is None:
        current_prepaid_credits = 0
    current_monthly_credits_left = monthly_credits_limit - current_monthly_credits
    current_prepaid_credits_left = prepaid_credits_limit - current_prepaid_credits
    return current_monthly_credits_left, current_prepaid_credits_left


def update_credit_usage(
    uid: str,
    plan: str,
    task_credit_cost: float,
    monthly_credits_left: int,
    prepaid_credits_left: int,
    monthly_credits_limit: int,
    prepaid_credits_limit: int,
):

    if task_credit_cost <= monthly_credits_left:
        monthly_credit_spenditure = task_credit_cost
        prepaid_credit_spenditure = 0
    else:
        monthly_credit_spenditure = monthly_credits_left
        remaining_cost = task_credit_cost - monthly_credit_spenditure
        prepaid_credit_spenditure = remaining_cost

    # update the number of credits spent
    monthly_credits_usage = math.ceil(
        monthly_credits_limit - monthly_credits_left + monthly_credit_spenditure
    )
    prepaid_credits_usage = math.ceil(
        prepaid_credits_limit - prepaid_credits_left + prepaid_credit_spenditure
    )
    update_data_firestore_DB(
        uid,
        {
            f"plan_usage.{plan}.n_credits": monthly_credits_usage,
            "n_prepaid_credits": prepaid_credits_usage,
        },
    )
    return monthly_credits_usage, prepaid_credits_usage
