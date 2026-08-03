"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { getGoogleRedirectResult, googleErrorMessage } from "@/lib/firebase";

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
    (async () => {
      try {
        const cred = await getGoogleRedirectResult();
        if (!cred || cancelled) return;
        setCompleting(true);
        const result = await api.POST("/v1/auth/register", {
          body: {
            name: cred.user.displayName ?? "",
            avatar: cred.user.photoURL ?? "",
            is_google_auth: true,
            tos_accepted: false,
          },
        });
        if (cancelled) return;
        if (result.error) {
          setRedirectError(
            `Signed in with Google, but account setup failed: ${JSON.stringify(result.error).slice(0, 140)}`
          );
          setCompleting(false);
          return;
        }
        router.replace(result.data?.already_registered ? "/app" : "/onboarding");
      } catch (err) {
        if (!cancelled) {
          setRedirectError(googleErrorMessage(err));
          setCompleting(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { redirectError, completing };
}
