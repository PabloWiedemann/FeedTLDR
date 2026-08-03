# Free trial abuse protection setup

FeedTLDR now gives each account 50 one-time trial credits. The same balance pays
for manual summaries, chat, and scheduled free newsletters. Free credits never
reset, including after an upgrade and later downgrade.

The application already enforces the credit limit. The services below make it
harder for one person or a bot to create many accounts and collect another 50
credits each time.

## 1. Set up Cloudflare Turnstile

A free Cloudflare account is required for this step. You do not need to move the
website, change nameservers, or proxy the domain through Cloudflare just to use
Turnstile.

1. Create or log in to a Cloudflare account.
2. Open **Turnstile** in the Cloudflare dashboard.
3. Select **Add widget**.
4. Name it `FeedTLDR signup`.
5. Add `feedtldr.com` and `www.feedtldr.com` as hostnames. Add the exact staging
   hostname too if signup is tested on staging.
6. Choose the **Managed** widget mode and create it.
7. Copy the **site key** and **secret key**. They are different values.
8. Add the site key to the web deployment:

   ```text
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=the_site_key
   ```

9. Add the secret to the API deployment:

   ```text
   TURNSTILE_SECRET_KEY=the_secret_key
   TURNSTILE_ALLOWED_HOSTNAMES=feedtldr.com,www.feedtldr.com
   ```

10. Generate a separate long random secret and add it to every API instance:

    ```text
    SIGNUP_CHALLENGE_SECRET=the_random_secret
    ```

    For example, macOS can generate one with `openssl rand -hex 32`. This value
    is private and must never be added to the web app.

11. Redeploy the API and web app. Public `NEXT_PUBLIC_` variables are included
    when the web app builds, so restarting only the running process is not
    enough.
12. Create a test account. The security check should appear on signup, and the
    account should not finish setup until its email is verified.

## 2. Configure Firebase email verification

1. Open **Firebase Console → Authentication → Settings → Authorized domains**.
2. Confirm `feedtldr.com`, `www.feedtldr.com`, and the staging hostname are
   present.
3. Open **Authentication → Templates → Email address verification**.
4. Set the sender name and reply-to address that customers should see.
5. Send a test verification email from the signup page and confirm that the
   link returns to `/verify-email` and then continues to onboarding.

Existing registered users remain usable. Verification is required before a new
Firestore customer record—and therefore a new 50-credit trial—is created.

## 3. Add Firebase App Check after Turnstile is working

App Check helps reject scripts that call the API directly instead of using the
real FeedTLDR web app. Roll it out after Turnstile so it can be observed before
enforcement.

1. Open **Firebase Console → App Check** and select the FeedTLDR web app.
2. Register the web app with the **reCAPTCHA Enterprise** provider.
3. Copy its site key into the web deployment:

   ```text
   NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY=the_recaptcha_enterprise_site_key
   ```

4. Redeploy the web app and confirm normal login, feed loading, generation, and
   chat requests still work.
5. Add this to the API deployment and redeploy it:

   ```text
   FIREBASE_APP_CHECK_ENFORCED=1
   ```

Do not enable enforcement before the web key is live. Doing so would reject all
web API requests, including legitimate ones.

## 4. Enable signup rate limits only behind a trusted proxy

The API contains a small backup rate limiter. It is per running API instance,
so a Cloudflare edge rate-limiting rule is stronger when the domain is already
proxied through Cloudflare.

If the API receives traffic through a trusted Cloudflare proxy, add:

```text
TRUST_PROXY_HEADERS=1
SIGNUP_CHALLENGE_RATE_LIMIT_PER_HOUR=10
SIGNUP_RATE_LIMIT_PER_DAY=3
```

Do not set `TRUST_PROXY_HEADERS=1` when clients can connect directly to the API;
otherwise a caller can forge its IP header. Leave the three values at `0` until
the proxy path is confirmed.

If Cloudflare proxies `api.feedtldr.com`, also create an edge rule for
`POST /v1/auth/signup-challenge`. Start with a managed challenge or a limit of
about 10 requests per IP per hour, monitor real traffic, and adjust before
blocking more aggressively.

## 5. What is deliberately not required

- No payment card is required for the trial.
- No Stripe customer is created at signup. Stripe is contacted only when the
  user chooses a paid plan.
- No phone number is required. Phone verification can be added later only for
  signups that look suspicious, avoiding SMS cost and conversion loss for
  ordinary users.

## Release checklist

- A new email/password account must verify its email before onboarding.
- Google signup should continue directly to onboarding after the security
  check.
- A free user with fewer credits than a requested action must be blocked.
- A free scheduled newsletter must deduct its full generation cost.
- A free user's credits must not reset monthly or after downgrade.
- Pricing must say **50 one-time trial credits**, **no card**, and **no time
  limit**.
- When credits are exhausted, summary generation, chat, and newsletter email
  messaging must link to `/pricing`.
