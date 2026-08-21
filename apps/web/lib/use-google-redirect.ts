"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { registerAccount } from "@/lib/auth";
import {
  clearGoogleRedirectPending,
  getGoogleRedirectResult,
  googleErrorMessage,
  googleRedirectPending,
} from "@/lib/firebase";

/**
 * Completes a redirect-style Google sign-in when the user returns from
 * Google: registers the account with the API (idempotent) and routes to the
 * feed or onboarding. Used by the login and signup pages.
 */
export function useGoogleRedirect() {
  const router = useRouter();
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function completeSignIn() {
      // The flag set when leaving for Google makes the wait visible right
      // away — getRedirectResult alone can take seconds to resolve, during
      // which the page would otherwise look idle.
      if (googleRedirectPending()) setCompleting(true);
      try {
        const credential = await getGoogleRedirectResult();
        if (!credential || cancelled) {
          if (!cancelled) setCompleting(false);
          return;
        }
        setCompleting(true);
        const destination = await registerAccount(credential);
        if (!cancelled) router.replace(destination);
      } catch (error) {
        if (cancelled) return;
        setRedirectError(
          error instanceof Error && error.name === "AccountSetupError"
            ? error.message
            : googleErrorMessage(error)
        );
        setCompleting(false);
      } finally {
        clearGoogleRedirectPending();
      }
    }

    void completeSignIn();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { redirectError, completing };
}
