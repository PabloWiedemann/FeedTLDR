from config.credits_config import CREDITS_CONFIG
from config.plans_config import PLAN_PROPERTIES


class CreditsCalculator:
    def __init__(self, credits_config: dict = CREDITS_CONFIG):
        self.credits_config = credits_config

    def compute_twitter_posts_scraping_credits_per_post(self) -> int:
        return (
            self.credits_config["scrapers"]["twitter"]["price_per_post"]
            * self.credits_config["credit_to_price_ratio"]
        )

    def compute_twitter_followers_scraping_credits_per_follower(self) -> int:
        return (
            self.credits_config["scrapers"]["twitter"]["price_per_follower"]
            * self.credits_config["credit_to_price_ratio"]
        )

    def compute_summary_generation_credits_per_run(self) -> int:
        return (
            self.credits_config["summary_price_per_run"]
            * self.credits_config["credit_to_price_ratio"]
        )

    def compute_audiogeneration_credits_per_run(self) -> int:
        return (
            self.credits_config["audio_price_per_run"]
            * self.credits_config["credit_to_price_ratio"]
        )

    def compute_chat_message_credits_per_message(self) -> int:
        return (
            self.credits_config["chat_price_per_message"]
            * self.credits_config["credit_to_price_ratio"]
        )

    def compute_posts_scraping_credits(self, plan: str) -> int:
        post_limits = PLAN_PROPERTIES[plan]["limits"]["max_tweets_per_generation"]
        crds = post_limits * self.compute_twitter_posts_scraping_credits_per_post()
        return crds

    def compute_followers_scraping_credits(self, plan: str) -> int:
        follower_limits = min(
            PLAN_PROPERTIES[plan]["limits"]["max_followers"], 1000
        )
        crds = (
            follower_limits
            * self.compute_twitter_followers_scraping_credits_per_follower()
        )
        return crds

    def compute_full_gen_run_credits(self, plan: str) -> int:
        crds = self.compute_posts_scraping_credits(plan)
        crds += self.compute_summary_generation_credits_per_run()
        crds += self.compute_audiogeneration_credits_per_run()
        return crds
