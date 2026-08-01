# NOTE: price is are in USD
CREDITS_CONFIG = {
    "credit_to_price_ratio": 100,  # 1$ = 100 credits
    "scrapers": {
        "twitter": {
            "price_per_post": 0.4 / 1000.0,
            "price_per_follower": 0.15 / 1000.0,
        },
    },
    "summary_price_per_run": 0.02,
    "audio_price_per_run": 0.02,
    "chat_price_per_message": 0.03,
}

