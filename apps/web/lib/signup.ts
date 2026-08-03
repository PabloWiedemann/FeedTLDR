import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

const STORAGE_KEY = "feedtldr.pending-signup";

export type PendingSignup = {
  email: string;
  name: string;
  avatar: string;
  isGoogleAuth: boolean;
  challenge: string;
};

export const turnstileConfigured = Boolean(
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
);

export async function requestSignupChallenge(
  email: string,
  turnstileToken: string | null
): Promise<string> {
  const result = await api.POST("/v1/auth/signup-challenge", {
    body: {
      email,
      turnstile_token: turnstileToken,
    },
  });
  return unwrap<components["schemas"]["SignupChallengeResponse"]>(result)
    .challenge_token;
}

export async function registerAccount(pending: PendingSignup) {
  return unwrap<components["schemas"]["RegisterResponse"]>(
    await api.POST("/v1/auth/register", {
      body: {
        name: pending.name,
        avatar: pending.avatar,
        is_google_auth: pending.isGoogleAuth,
        tos_accepted: false,
        signup_challenge: pending.challenge,
      },
    })
  );
}

export function savePendingSignup(value: PendingSignup) {
  // Verification links commonly open in a new tab. localStorage preserves the
  // email-bound, 24-hour challenge across that tab boundary; it is cleared as
  // soon as registration completes.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Restricted browsers can still finish with a fresh challenge on the
    // verification page; storage failure must not strand the Firebase user.
  }
}

export function loadPendingSignup(): PendingSignup | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingSignup) : null;
  } catch {
    return null;
  }
}

export function clearPendingSignup() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}
