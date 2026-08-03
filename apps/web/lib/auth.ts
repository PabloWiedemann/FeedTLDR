"use client";

import type { UserCredential } from "firebase/auth";
import {
  registerAccount as registerPendingAccount,
  savePendingSignup,
  type PendingSignup,
} from "@/lib/signup";

/** Where a completed sign-in should land, depending on whether we have met
 *  this account before. */
export const AFTER_SIGN_IN = {
  existing: "/app",
  new: "/onboarding",
  verify: "/verify-email",
} as const;

export class AccountSetupError extends Error {
  constructor(detail: string) {
    super(`Signed in, but account setup failed: ${detail}`);
    this.name = "AccountSetupError";
  }
}

const MAX_DETAIL_LENGTH = 140;

/**
 * Creates the Firestore document for a Firebase Auth user.
 * Idempotent, and called from every path that can produce a new account
 * (email signup, Google popup, Google redirect return).
 *
 * @returns the route to send the user to next.
 */
export async function registerAccount(
  credential: Pick<UserCredential, "user">
): Promise<string> {
  const pending: PendingSignup = {
    email: credential.user.email ?? "",
    name: credential.user.displayName ?? "",
    avatar: credential.user.photoURL ?? "",
    isGoogleAuth: credential.user.providerData.some(
      (provider) => provider.providerId === "google.com"
    ),
    challenge: "",
  };
  try {
    const result = await registerPendingAccount(pending);
    return result.already_registered
      ? AFTER_SIGN_IN.existing
      : AFTER_SIGN_IN.new;
  } catch (error) {
    if (/email_not_verified|security check/i.test(String(error))) {
      savePendingSignup(pending);
      return AFTER_SIGN_IN.verify;
    }
    throw new AccountSetupError(String(error).slice(0, MAX_DETAIL_LENGTH));
  }
}

/** Plain-language explanation for an email/password sign-in failure. */
export function loginErrorMessage(error: unknown): string {
  const code = String(error);
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "Wrong email or password.";
  if (code.includes("user-not-found"))
    return "No account exists with this email.";
  if (code.includes("too-many-requests"))
    return "Too many attempts. Try again in a few minutes.";
  return "Could not log in. Try again.";
}

/** Plain-language explanation for an email/password signup failure. */
export function signupErrorMessage(error: unknown): string {
  return String(error).includes("email-already-in-use")
    ? "An account with this email already exists. Log in instead."
    : "Could not create your account. Try again.";
}
