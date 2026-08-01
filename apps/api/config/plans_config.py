PLAN_PROPERTIES = {
    # ---------------- Admin Plan ----------------
    "admin": {
        "limits": {
            "max_followers": 1000000,  # Max. allowed accounts to scrape. -1 means unlimited accounts.
            "max_tweets_per_generation": 1000,  # Number of tweets to scrape per account
            "max_newsletters_sent": 1000000,  # Number of newsletter emails
            "max_credits": 1000000,
        },
    },
    # ---------------- Free Plan ----------------
    "free": {
        "limits": {
            "max_followers": 200,  # Max. allowed accounts to scrape. -1 means unlimited accounts.
            "max_tweets_per_generation": 250,  # Number of tweets to scrape per account
            "max_newsletters_sent": 5,  # Number of newsletter emails
            "max_credits": 50,
        },
        "price": {"month": 0, "year": 0},
    },
    # ---------------- Basic Plan ----------------
    "basic": {
        "limits": {
            "max_followers": 200,
            "max_tweets_per_generation": 250,
            "max_credits": 50,
        },
        "price": {"month": 4.99, "year": 49.99},
        "stripeId_test": {
            "month": "price_1QdB0tBSIOKhGu9samWBeujr",
            "year": "price_1QdB4TBSIOKhGu9s97f3qdx4",
        },
        "stripeId_live": {
            "month": "price_1QuSNSBSIOKhGu9s7cpQmgAM",
            "year": "price_1QugJUBSIOKhGu9sOJLGF8X0",
        },
    },
    # ---------------- Pro Plan ----------------
    "pro": {
        "limits": {
            "max_followers": 500,
            "max_tweets_per_generation": 700,
            "max_credits": 100,
        },
        "price": {"month": 11.99, "year": 119.99},
        "stripeId_test": {
            "month": "price_1QdB3kBSIOKhGu9shFqY5Le1",
            "year": "price_1QdB7wBSIOKhGu9s2JgWUczf",
        },
        "stripeId_live": {
            "month": "price_1QugNbBSIOKhGu9sA802Pm3b",
            "year": "price_1QugOJBSIOKhGu9sognCzhcL",
        },
    },
}
