"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerAccount } from "@/lib/auth";
import { googleErrorMessage, loginWithGoogle } from "@/lib/firebase";

/**
 * Popup-style Google sign-in, used by the login and signup pages. In
 * auth-proxy mode the call navigates away instead of resolving, and the
 * return trip is handled by useGoogleRedirect.
 */
export function useGoogleSignIn() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    try {
      const credential = await loginWithGoogle();
      if (!credential) return; // redirect flow: the page is navigating to Google
      router.push(await registerAccount(credential));
    } catch (caught) {
      setError(
        caught instanceof Error && caught.name === "AccountSetupError"
          ? caught.message
          : googleErrorMessage(caught)
      );
    }
  }

  return { signIn, googleError: error, setGoogleError: setError };
}
