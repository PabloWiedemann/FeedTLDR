"use client";

import type { UserCredential } from "firebase/auth";
import { api } from "@/lib/api/client";

/** Where a completed sign-in should land, depending on whether we have met
 *  this account before. */
export const AFTER_SIGN_IN = { existing: "/app", new: "/onboarding" } as const;

export class AccountSetupError extends Error {
  constructor(detail: string) {
    super(`Signed in with Google, but account setup failed: ${detail}`);
    this.name = "AccountSetupError";
  }
}

const MAX_DETAIL_LENGTH = 140;

/**
 * Creates the Firestore document and Stripe customer for a Firebase Auth user.
 * Idempotent, and called from every path that can produce a new account
 * (email signup, Google popup, Google redirect return).
 *
 * @returns the route to send the user to next.
 */
export async function registerAccount(
  credential: Pick<UserCredential, "user">
): Promise<string> {
  const result = await api.POST("/v1/auth/register", {
    body: {
      name: credential.user.displayName ?? "",
      avatar: credential.user.photoURL ?? "",
      is_google_auth: true,
      tos_accepted: false,
    },
  });

  if (result.error) {
    throw new AccountSetupError(
      JSON.stringify(result.error).slice(0, MAX_DETAIL_LENGTH)
    );
  }

  return result.data?.already_registered
    ? AFTER_SIGN_IN.existing
    : AFTER_SIGN_IN.new;
}

/** Registers an email/password signup, where the name comes from the form. */
export async function registerEmailAccount(name: string): Promise<void> {
  const result = await api.POST("/v1/auth/register", {
    body: { name, avatar: "", is_google_auth: false, tos_accepted: false },
  });
  if (result.error) throw new Error("register_failed");
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
