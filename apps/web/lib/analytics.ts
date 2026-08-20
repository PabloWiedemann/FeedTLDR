import posthog from "posthog-js";

/**
 * Every product event lives in this union so funnel steps stay discoverable
 * and typo-proof. Add new events here first, then capture them at the call
 * site with `track`.
 */
export type AnalyticsEvent =
  | "cta_clicked"
  | "signup_completed"
  | "onboarding_survey_submitted"
  | "onboarding_completed"
  | "generation_started"
  | "generation_completed"
  | "generation_failed"
  | "checkout_started"
  | "subscription_purchased";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/** No-ops without a key so local dev and CI never send or warn. */
export const analyticsEnabled = Boolean(key);

export function initAnalytics() {
  if (!key) return;
  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    defaults: "2025-05-24",
  });
}

export function track(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
  options?: {
    /** Skip batching; needed when a redirect immediately unloads the page. */
    sendInstantly?: boolean;
  }
) {
  if (!key) return;
  posthog.capture(event, properties, {
    send_instantly: options?.sendInstantly,
  });
}

/** Ties events to the account so funnels survive device and session changes. */
export function identifyUser(
  uid: string,
  properties: { email?: string | null; name?: string | null }
) {
  if (!key) return;
  posthog.identify(uid, {
    ...(properties.email ? { email: properties.email } : {}),
    ...(properties.name ? { name: properties.name } : {}),
  });
}

/** Detaches this browser from the account after sign-out. */
export function resetAnalytics() {
  if (!key) return;
  posthog.reset();
}
