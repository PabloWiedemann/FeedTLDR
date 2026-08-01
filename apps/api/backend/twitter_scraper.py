from apify_client import ApifyClient
import pandas as pd
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from config.plans_config import PLAN_PROPERTIES
from utils import get_logger
import re
import os
from dotenv import load_dotenv
import time
from pydantic import BaseModel
from typing import Optional
from utils import convert_timezone_to_utc
import random

load_dotenv()
logger = get_logger("main_logger")


class Author(BaseModel):
    userName: str


class Tweet(BaseModel):
    author: Author
    createdAt: str
    text: str
    likeCount: Optional[int] = None
    viewCount: Optional[int] = None
    url: str
    isReply: bool
    quote: Optional[dict] = None


def is_valid_tweet(tweet: dict) -> bool:
    """
    Validates if a tweet contains all required fields for processing using Pydantic.

    Args:
        tweet: Dictionary containing tweet data

    Returns:
        bool: True if tweet contains all required fields, False otherwise
    """
    try:
        Tweet.model_validate(tweet)
        return True
    except Exception as e:
        logger.debug(f"Invalid tweet: {str(e)}")
        return False


def is_valid_X_account_url(url):
    pattern = r"^https?://(www\.)?x\.com/[A-Za-z0-9_]+/?$"
    return re.match(pattern, url) is not None


def X_account_to_url(account):
    account_url = f"https://x.com/{account.replace('@', '')}"
    assert is_valid_X_account_url(account_url)
    return account_url


def url_to_X_account(url):
    return f"@{url.split('/')[-1]}"


def convert_date_format(date_string):
    # Parse the input date string
    dt = datetime.strptime(date_string, "%a %b %d %H:%M:%S %z %Y")

    # Convert to desired format
    return dt.strftime("%Y-%m-%d-%H")


def get_start_date(timezone_str="UTC+00:00"):
    """
    Calculate start date based on timezone offset.

    Args:
        timezone_str: String in format "UTC+HH:MM" or "UTC-HH:MM"
                     Examples: "UTC+05:30", "UTC-08:00", "UTC+00:00"
    """
    # Extract the offset from the timezone string
    offset_hours = int(timezone_str[3:6])
    offset_minutes = int(timezone_str[7:9])

    # Create a timedelta object for the offset
    offset = timedelta(hours=offset_hours, minutes=offset_minutes)

    # Get the current time in UTC
    now_utc = datetime.now(ZoneInfo("UTC"))

    # Apply the offset
    today_date = now_utc + offset

    # Calculate yesterday's date
    yesterday_date = today_date - timedelta(days=1)

    # Format the start date
    start_date = yesterday_date.strftime("%Y-%m-%d")

    return start_date


def get_tweets(
    client,
    queries,
    max_items=None,
    start_date=None,
    oldest_date=None,
    twitter_scraper_actor="61RPP7dywgiy0JPD0",
):
    """
    Scrapes latests X posts from the given list of accounts using the Apify Twitter Profile Scraper.
    """

    # define search terms
    run_input = {
        "searchTerms": queries,
        "sort": "Latest",
    }

    # add max items if provided
    if max_items:
        if max_items > 1000:
            logger.warning("❌ Max tweets exceeds cost limit. Limiting to 1000.")
            max_items = 1000
        run_input["maxItems"] = max_items

    # add start date if provided
    if start_date:
        assert isinstance(start_date, str), "start_date must be a string"
        # Verify start_date is in YYYY-MM-DD format
        try:
            datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise ValueError("start_date must be in YYYY-MM-DD format")
        run_input["start"] = start_date

    # add oldest date if provided
    if oldest_date:
        assert isinstance(oldest_date, str), "oldest_date must be a string"
        # Verify oldest_date is in YYYY-MM-DD format
        try:
            datetime.strptime(oldest_date, "%Y-%m-%d")
        except ValueError:
            raise ValueError("oldest_date must be in YYYY-MM-DD format")
        run_input["end"] = oldest_date

    # run the actor
    try:
        run = client.actor(twitter_scraper_actor).call(run_input=run_input)
    except Exception as e:
        raise Exception(f"Failed to call Twitter scraper actor: {str(e)}")

    # get the tweets
    tweets = list(client.dataset(run["defaultDatasetId"]).iterate_items())

    return tweets


def check_empty_results(tweets):
    # Add check for no results
    if all(item.get("noResults", False) for item in tweets):
        return True
    else:
        return False


def build_queries(accounts, max_char_limit=500, add_filter_replies_term=True):
    """
    Build search queries for Twitter accounts, splitting into multiple queries if needed to stay under character limit.

    Args:
        accounts: List of account handles
        max_char_query: Maximum characters allowed per query
        add_filter_replies_term: Whether to add -filter:replies to each query

    Returns:
        List of query strings
    """
    queries = []
    current_query = ""
    filter_term = " -filter:replies" if add_filter_replies_term else ""

    for i, account in enumerate(accounts):
        account_term = f"from:{account.replace('@', '')}"
        # First account in a query
        if not current_query:
            new_segment = account_term
        # Additional accounts need OR prefix
        else:
            new_segment = f" OR {account_term}"

        # Check if adding this account would exceed limit
        if len(current_query + new_segment + filter_term) > max_char_limit:
            # Save current query and start new one
            queries.append(current_query + filter_term)
            current_query = account_term
        else:
            current_query += new_segment

    # Add final query if there is one
    if current_query:
        queries.append(current_query + filter_term)

    return queries


def convert_to_df(tweets):
    """
    Process raw tweets data into a cleaned pandas DataFrame.

    Args:
        tweets: List of raw tweet dictionaries from the API

    Returns:
        pd.DataFrame: Cleaned DataFrame containing processed tweet data
    """
    tweets_list = [
        {
            "author": tweet.get("author"),
            "createdAt": tweet.get("createdAt"),
            "text": tweet.get("text"),
            "likeCount": tweet.get("likeCount"),
            "viewCount": tweet.get("viewCount"),
            "url": tweet.get("url"),
            "quote": tweet.get("quote"),
        }
        for tweet in tweets
    ]
    logger.debug(f"Initial tweet count: {len(tweets_list)}")

    # convert to dataframe
    df = pd.DataFrame(tweets_list)

    # clean data
    df.dropna(subset=["createdAt", "text"], inplace=True)
    df["userName"] = df["author"].apply(
        lambda x: x["userName"] if isinstance(x, dict) else None
    )
    df["createdAt"] = df["createdAt"].apply(convert_date_format)

    return df


def get_active_accounts(df: pd.DataFrame, start_date: str) -> tuple[list[str], str]:
    """
    Returns a list of account names whose last tweet is on or after the specified start date,
    along with the oldest tweet date among active accounts.

    Args:
        df: DataFrame containing tweet data with 'userName' and 'createdAt' columns
        start_date: Date string in format 'YYYY-MM-DD'

    Returns:
        Tuple containing:
        - List of usernames that have tweeted since the start date
        - String representing the oldest tweet date (YYYY-MM-DD-HH format)
    """

    # Group by userName and get the latest tweet date for each account
    oldest_tweets = df.groupby("userName")["createdAt"].min().reset_index()

    # Filter accounts whose last tweet is >= start_date
    active_df = oldest_tweets[oldest_tweets["createdAt"] >= start_date]
    active_accounts = active_df["userName"].tolist()

    # Get the oldest tweet date among active accounts
    oldest_date = active_df["createdAt"].min() if not active_df.empty else None
    if oldest_date:
        oldest_date = datetime.strptime(oldest_date, "%Y-%m-%d-%H").strftime("%Y-%m-%d")

    return active_accounts, oldest_date


def clean_tweets(df, start_date=None, columns=None, ntweets=None):
    """
    Clean and filter tweet data.

    Args:
        df: DataFrame containing tweet data
        start_date: Date to filter tweets from
        columns: List of column names to keep
        ntweets: Number of tweets to keep
    Returns:
        Cleaned DataFrame with only specified columns,
        or None if no tweets remain after cleaning
    """

    # remove duplicates
    df = df.drop_duplicates(subset="url", keep="first")

    # Filter by date
    if start_date:
        df = df[df["createdAt"] >= start_date].copy()

    if df.empty:
        return None

    # Clean quote field
    df["quote"] = df["quote"].apply(
        lambda x: x["text"] if isinstance(x, dict) else None
    )

    # Keep only specified columns
    if columns:
        df = df[columns]

    # sort by createdAt from most recent to oldest
    df = df.sort_values(by="createdAt", ascending=False)

    # Keep only ntweets
    if ntweets:
        df = df.head(ntweets)

    return df


def run_scraper(
    client,
    accounts,
    max_batchsize=5,
    max_tweets=None,
):
    """
    Runs the scraper for a given list of accounts.
    """

    # split accounts into N queries
    queries = build_queries(accounts, max_char_limit=500, add_filter_replies_term=True)
    logger.info(f"Number of queries: {len(queries)}")
    logger.debug(f"Queries: {queries}")

    # limit number of queries based on min tweets per query
    min_tweets_per_query = 50
    if max_tweets and max_tweets < min_tweets_per_query * len(queries):
        queries = queries[: max_tweets // min_tweets_per_query]
        logger.warning(
            f"❌ Number of queries exceeds max tweets. Limiting to {len(queries)} queries."
        )

    # compute number of tweets per query
    ntweets_per_query = max_tweets // len(queries) if max_tweets else 50

    # split queries into batches
    queries_batches = [
        queries[i : i + max_batchsize] for i in range(0, len(queries), max_batchsize)
    ]

    # run scraper
    logger.info("Start scraping tweets...")
    logger.debug(f"Number of queries: {len(queries)}")
    logger.debug(f"Max tweets: {max_tweets}")
    logger.info(f"Number of batch iterations: {len(queries_batches)}")
    tweets = []
    for i, queries_batch in enumerate(queries_batches):
        start_time_batch = time.time()
        if i > 0:
            sleep_time = 10
            logger.info(
                f"Sleeping for {sleep_time} seconds before next batch to avoid rate limits..."
            )
            time.sleep(sleep_time)

        # compute max tweets based on number of queries in batch
        ntweets = ntweets_per_query * len(queries_batch)
        logger.debug(f"Max tweets: {ntweets}")
        logger.debug(f"Batch {i+1} of {len(queries_batches)}")

        # run scraper
        tweets_batch = get_tweets(client, queries_batch, max_items=ntweets)
        tweets.extend(tweets_batch)
        logger.info(
            f"Batch {i+1} of {len(queries_batches)} finished. Time taken: {time.time() - start_time_batch:.2f} seconds"
        )

    # check if no tweets were scraped
    if check_empty_results(tweets):
        logger.error("❌ No tweets found (1)")
        return []

    # Validate tweets
    valid_tweets = [tweet for tweet in tweets if is_valid_tweet(tweet)]
    valid_tweets = [tweet for tweet in valid_tweets if not tweet.get("isReply", False)]
    if len(valid_tweets) != len(tweets):
        logger.warning(
            f"❗ Some tweets are invalid. Removing {len(tweets) - len(valid_tweets)} invalid tweets..."
        )
        tweets = valid_tweets

    return tweets


def scrape_accounts_posts(
    accounts: list[str],
    plan: str,
    timezone: str,
    output_data_path: str,
):
    """
    Scrapes latests X posts from the given list of accounts.
    Makes sure follows plans and timezone settings.

    Args:
        accounts: List of X/Twitter account handles to scrape
        plan: Plan tier ('free', 'basic', etc) that determines scraping limits
        timezone: Timezone string in format 'UTC+HH:MM' or 'UTC-HH:MM'
        output_data_path: Path where scraped data CSV will be saved
        n_batch_queries: Number queries to be send to the API at once

    Returns:
        DataFrame containing the scraped tweet data, or None if no tweets found
    """

    logger.info("Starting Twitter scraping process")

    # Load plan-specific configurations
    api_key = os.environ["APIFY_API_KEY"]
    ntweets = PLAN_PROPERTIES[plan]["limits"]["max_tweets_per_generation"]
    logger.info(f"Plan: {plan}, Max tweets per account: {ntweets}")
    logger.info(f"Number of accounts to scrape: {len(accounts)}")
    logger.debug(f"Timezone: {timezone}")
    logger.debug(f"Output path: {output_data_path}")

    # Initialize the ApifyClient with your API token
    client = ApifyClient(api_key)

    # compute date
    start_date = get_start_date(convert_timezone_to_utc(timezone))
    logger.debug(f"Start date: {start_date}")

    # remove duplicates
    accounts = list(set(accounts))

    # limit accounts to plan limits
    max_accounts = PLAN_PROPERTIES[plan]["limits"]["max_followers"]
    if len(accounts) > max_accounts:
        logger.warning(
            f"❌ Number of accounts exceeds plan limits. Limiting to {max_accounts} accounts."
        )
        accounts = random.sample(accounts, max_accounts)

    # run first round of scraping
    start_time_scraper = time.time()
    tweets = run_scraper(client, accounts, max_tweets=ntweets)
    n_scraped_tweets = len(tweets)
    n_runs = 1
    if not tweets:
        logger.warning("❌ No tweets were scraped.")
        return [], {}
    logger.info(f"Scraped {n_scraped_tweets} tweets")
    logger.info(f"Time taken: {time.time() - start_time_scraper:.2f} seconds")

    # convert to dataframe
    df = convert_to_df(tweets)

    # clean data
    columns = [
        "userName",
        "createdAt",
        "text",
        "likeCount",
        "viewCount",
        "url",
        "quote",
    ]
    logger.info("Cleaning tweets...")
    df = clean_tweets(df, start_date, columns, ntweets)
    if df is None:
        logger.warning("❌ No tweets remained after cleaning.")
        return [], {}
    logger.info(f"{len(df)} tweets remained after cleaning")

    # # get active accounts
    # active_accounts, oldest_date = get_active_accounts(df, start_date)

    # # if len(df) <= ntweets and len(active_accounts) > 0:
    # #     assert oldest_date >= start_date, "Something went wrong: oldest tweet date is before start date"

    # #     # do a second run with active accounts
    # #     second_round_tweets = run_scraper(client, active_accounts, oldest_date=oldest_date)

    # #     # convert to dataframe
    # #     df_active = convert_to_df(second_round_tweets)

    # #     # merge dataframes
    # #     df = pd.concat([df, df_active])

    # # # clean data
    # # df = clean_tweets(df, start_date, columns, ntweets)

    # save results
    logger.info(f"Saving results to CSV: {output_data_path}")
    df.to_csv(output_data_path, index=True, index_label="index")
    logger.info("✅ Scraping process completed")

    # cost tracker
    cost_tracker = {
        "scrapers": {
            "twitter": {
                "n_scraper_runs": n_runs,
                "n_scraped_tweets": n_scraped_tweets,
                "n_saved_tweets": len(df),
            }
        }
    }

    return df, cost_tracker


def scrape_accounts_followers(
    X_account: str, max_followers: int = 1000
):
    """
    Scrapes followers that the given X account follows
    """

    # Initialize the ApifyClient with your API token
    api_key = os.environ["APIFY_API_KEY"]
    client = ApifyClient(api_key)

    account_url = X_account_to_url(X_account)
    logger.info(f"Scraping accounts for: {X_account}")

    # Prepare the Actor input for follower scraping
    run_input = {
        "startUrls": [account_url],
        "getFollowers": False,
        "getFollowing": True,
        "getRetweeters": False,
        "includeUnavailableUsers": False,
        "maxItems": max_followers,
    }
    run_input = {
        "getFollowers": False,
        "getFollowing": True,
        "maxFollowers": 200,
        "maxFollowings": max_followers,
        "user_names": [
            X_account.replace("@", "")
        ]
    }

    # check_run = client.actor("apify/twitter-profile-scraper").call(run_input=check_input)
    # actor_id = "V38PZzpEgOfeeWvZY"
    actor_id = "C2Wk3I6xAqC4Xi63f"
    run = client.actor(actor_id).call(run_input=run_input)
    result = list(client.dataset(run["defaultDatasetId"]).iterate_items())

    # Fetch and print Actor results from the run's dataset (if there are any)
    # followers_urls = []
    # for item in result:
    #     if "noResults" in item and item["noResults"]:
    #         break
    #     account_url = item["url"]
    #     assert is_valid_X_account_url(account_url)
    #     followers_urls.append(account_url)
    # followers_urls = list(set(followers_urls))
    # followers_accounts = [url_to_X_account(url) for url in followers_urls]
    followers_accounts = []
    for item in result:
        if "noResults" in item and item["noResults"]:
            break
        followers_accounts.append(item["screen_name"])
    return followers_accounts


def verify_account_exists(accounts: list[str], batchsize: int = 20):
    """
    Verifies if the given list of accounts exist.

    Args:
        accounts: List of X/Twitter account handles to verify
        batchsize: Number of accounts to send to the API at once

    Returns:
        List of accounts that do not exist
    """

    # Arrange
    api_key = os.environ["APIFY_API_KEY"]
    client = ApifyClient(api_key)

    # remove duplicates
    accounts = list(set(accounts))

    # split accounts into batches
    accounts_batches = [
        accounts[i : i + batchsize] for i in range(0, len(accounts), batchsize)
    ]

    # init accounts not found
    accounts_not_found = []

    # Track which accounts have @ prefix in input
    original_format = {}
    for acc in accounts:
        clean_name = acc.replace("@", "")
        original_format[clean_name] = acc

    for accounts_batch in accounts_batches:
        # Ensure at least 5 accounts by repeating entries if needed
        while len(accounts_batch) < 5:
            accounts_batch.extend(accounts_batch[: 5 - len(accounts_batch)])

        # Remove @ prefix for API call
        clean_accounts = [acc.replace("@", "") for acc in accounts_batch]

        # Prepare the Actor input for follower scraping
        run_input = {
            "getFollowers": False,
            "getFollowing": False,
            "getRetweeters": False,
            "includeUnavailableUsers": False,
            "twitterHandles": clean_accounts,
        }

        run = client.actor("V38PZzpEgOfeeWvZY").call(
            run_input=run_input, timeout_secs=30
        )
        result = list(client.dataset(run["defaultDatasetId"]).iterate_items())

        # check if accounts exist
        for item in result:
            if "noResults" in item:
                message = item["message"]
                account_name = message.split(": ")[1].split(" ")[0].strip()
                # Return in original format
                accounts_not_found.append(original_format.get(account_name, account_name))

    # remove duplicates
    accounts_not_found = list(set(accounts_not_found))

    return accounts_not_found
