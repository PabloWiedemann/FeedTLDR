import time
import tempfile
import os
from apify_client import ApifyClient
from backend.twitter_scraper import (
    get_tweets,
    scrape_accounts_posts,
    scrape_accounts_followers,
    build_queries,
    run_scraper,
    verify_account_exists,
)
from datetime import datetime, timedelta


def test_build_query(test_accounts, simon_accounts):
    # Arrange
    accounts = test_accounts

    # Act
    queries = build_queries(accounts)

    # Assert
    assert len(queries) == 1
    expected = "from:elonmusk OR from:paulg OR from:levelsio -filter:replies"
    assert queries[0] == expected

    # Test single account
    single_query = build_queries(["@elonmusk"])
    assert single_query[0] == "from:elonmusk -filter:replies"

    # Test without replies filter
    query_with_replies = build_queries(accounts, add_filter_replies_term=False)
    assert query_with_replies[0] == "from:elonmusk OR from:paulg OR from:levelsio"

    # Test max char limit
    query_with_replies = build_queries(simon_accounts[:30], max_char_limit=500)
    assert all("-filter:replies" in query for query in query_with_replies)
    assert all(len(query) <= 500 for query in query_with_replies)


def test_get_tweets(test_accounts, simon_accounts):
    # Arrange
    api_key = os.environ["APIFY_API_KEY"]
    client = ApifyClient(api_key)
    accounts = test_accounts + simon_accounts[:97]  # total is 100 accounts
    queries = build_queries(accounts)
    assert len(queries) <= 5
    print()
    for i, query in enumerate(queries):
        print(f"Query {i}: '{query[:30]} ... {query[-40:]}'")

    # Act
    print("Testing get_tweets...")
    start_time = time.time()
    tweets = get_tweets(client, queries, max_items=50)
    end_time = time.time()
    print(f"Runtime: {end_time - start_time:.2f} seconds")
    print(f"Number of tweets: {len(tweets)}")

    # Assert
    assert tweets is not None
    assert len(tweets) == 50, f"Expected 50 tweets, got {len(tweets)}"

    # check none of the tweets are replies
    assert all(not tweet["isReply"] for tweet in tweets)

    # Check we got tweets from all accounts
    authors = set(tweet["author"]["userName"].lower() for tweet in tweets)
    expected_authors = set(account.replace("@", "").lower() for account in accounts)
    assert any(
        author in expected_authors for author in authors
    ), f"No tweets found from any expected accounts. Got tweets from {authors}, expected {expected_authors}"

    # Check tweet structure
    sample_tweet = tweets[0]
    assert isinstance(sample_tweet, dict)
    required_fields = ["author", "createdAt", "text", "url"]
    for field in required_fields:
        assert field in sample_tweet, f"Missing required field: {field}"

    # Check author structure
    assert isinstance(sample_tweet["author"], dict)
    assert "userName" in sample_tweet["author"]

    # Verify tweet content is valid
    assert isinstance(sample_tweet["text"], str)
    assert len(sample_tweet["text"]) > 0
    assert isinstance(sample_tweet["url"], str)
    assert "twitter.com" in sample_tweet["url"] or "x.com" in sample_tweet["url"]

    # check if start date is working
    # start_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    # print("Testing get_tweets with start date...")
    # start_time = time.time()
    # tweets = get_tweets(client, queries, max_items=None, start_date=start_date)
    # end_time = time.time()
    # print(f"Runtime: {end_time - start_time:.2f} seconds")
    # print(f"Number of tweets: {len(tweets)}")
    # assert all(
    #     datetime.strptime(
    #         tweet["createdAt"],
    #         "%a %b %d %H:%M:%S %z %Y"
    #     ).strftime("%Y-%m-%d") >= start_date
    #     for tweet in tweets
    # )

    # check if oldest date is working
    # oldest_date = start_date
    # print("Testing get_tweets with oldest date...")
    # start_time = time.time()
    # tweets = get_tweets(client, queries, max_items=50, oldest_date=oldest_date)
    # end_time = time.time()
    # print(f"Runtime: {end_time - start_time:.2f} seconds")
    # print(f"Number of tweets: {len(tweets)}")
    # assert len(tweets) == 50, f"Expected 50 tweets, got {len(tweets)}"
    # assert all(datetime.strptime(tweet["createdAt"], "%a %b %d %H:%M:%S %z %Y").strftime("%Y-%m-%d") <= oldest_date for tweet in tweets)


def test_run_scraper(simon_accounts, test_accounts):
    # Arrange
    api_key = os.environ["APIFY_API_KEY"]
    client = ApifyClient(api_key)
    accounts = test_accounts + simon_accounts[:7]  # total is 10 accounts

    # Act
    print("Testing run_scraper for one query batch...")
    start_time = time.time()
    tweets = run_scraper(client, accounts, max_batchsize=5, max_tweets=None)
    end_time = time.time()
    print(f"Runtime: {end_time - start_time:.2f} seconds")
    print(f"Number of tweets: {len(tweets)}")

    # assert no tweet is a reply by checking 'isReply' column in tweets
    assert all(not tweet["isReply"] for tweet in tweets)

    # Assert
    assert tweets is not None
    assert len(tweets) == 50

    # test with 5 accounts per batch
    print("Testing run_scraper for one query batch and max tweets set to 70...")
    start_time = time.time()
    tweets = run_scraper(client, accounts, max_batchsize=5, max_tweets=70)
    end_time = time.time()
    print(f"Runtime: {end_time - start_time:.2f} seconds")
    print(f"Number of tweets: {len(tweets)}")
    assert len(tweets) == 70

    # assert no tweet is a reply by checking 'isReply' column in tweets
    assert all(not tweet["isReply"] for tweet in tweets)

    # test with 4 queries in one batch and max tweets set to None
    print("Testing run_scraper for 4 queries in one batch and max tweets set to 100..")
    # NOTE: we expect 4*50 tweets because we have 4 queries, even thoughs we set max tweets to 100
    start_time = time.time()
    accounts = simon_accounts[:100]
    tweets = run_scraper(client, accounts, max_batchsize=5, max_tweets=100)
    end_time = time.time()
    print(f"Runtime: {end_time - start_time:.2f} seconds")
    print(f"Number of tweets: {len(tweets)}")
    assert len(tweets) == 100

    # assert no tweet is a reply by checking 'isReply' column in tweets
    assert all(not tweet["isReply"] for tweet in tweets)

    # test with multiple query batches and max tweets set to None
    print(
        "Testing run_scraper for multiple query batches with max tweets set to None..."
    )
    start_time = time.time()
    accounts = simon_accounts
    tweets = run_scraper(client, accounts, max_batchsize=5, max_tweets=1000)
    end_time = time.time()
    print(f"Runtime: {end_time - start_time:.2f} seconds")
    print(f"Number of tweets: {len(tweets)}")

    # assert no tweet is a reply by checking 'isReply' column in tweets
    assert all(not tweet["isReply"] for tweet in tweets)


def test_scrape_accounts_posts(simon_accounts, test_accounts):

    # Add first 3 accounts from simon_accounts to test_accounts
    test_accounts.extend(simon_accounts)
    print()
    print(f"Number of accounts: {len(test_accounts)}")
    # print(f"Accounts: {test_accounts}")

    # tmp file path
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, "test.csv")

    # Act
    print("Testing scrape_accounts_posts with BASIC plan...")
    start_time = time.time()
    df, _ = scrape_accounts_posts(test_accounts, "basic", "UTC+00:00", temp_file_path)
    end_time = time.time()
    print(f"Number of tweets: {len(df)}")
    print(f"Runtime: {end_time - start_time:.2f} seconds")

    print()
    print("Testing scrape_accounts_posts with PRO plan...")
    start_time = time.time()
    df, _ = scrape_accounts_posts(test_accounts, "pro", "UTC+00:00", temp_file_path)
    end_time = time.time()
    print(f"Number of tweets: {len(df)}")
    print(f"Runtime: {end_time - start_time:.2f} seconds")

    # assert file exists
    assert os.path.exists(temp_file_path)

    # assert df is not empty
    assert not df.empty

    # assert correct columns
    assert set(df.columns) == set(
        ["userName", "createdAt", "text", "likeCount", "viewCount", "url", "quote"]
    )

    # clean up
    os.remove(temp_file_path)


def test_scrape_fake_accounts_posts():

    # Add first 3 accounts from simon_accounts to test_accounts
    test_accounts = ["lskjlksdslfk", "ooioirtkor"]
    print()
    print(f"Number of accounts: {len(test_accounts)}")
    # print(f"Accounts: {test_accounts}")

    # tmp file path
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, "test.csv")

    # Act
    print("Testing scrape_accounts_posts with BASIC plan...")
    start_time = time.time()
    df, _ = scrape_accounts_posts(test_accounts, "basic", "UTC+00:00", temp_file_path)
    end_time = time.time()
    print(f"Number of tweets: {len(df)}")
    print(f"Runtime: {end_time - start_time:.2f} seconds")

    # assert df is empty
    assert not df


def test_scrape_accounts_followers():
    # Arrange
    account = "Wiedemann_Simon"

    # Act
    result = scrape_accounts_followers(account)
    print()
    print()

    # Assert
    assert result is not None  # Replace with actual expected results


def test_verify_account_exists():
    # Arrange
    real_accounts = ["elonmusk", "paulg", "levelsio"]
    fake_accounts = ["lskjlksdslfk", "ooioirtkor"]
    accounts = real_accounts + fake_accounts

    not_found_accounts = verify_account_exists(accounts)
    assert len(not_found_accounts) == len(
        fake_accounts
    ), f"Accounts not found: {not_found_accounts}"
    assert all(account in not_found_accounts for account in fake_accounts)
    assert not any(account in not_found_accounts for account in real_accounts)
