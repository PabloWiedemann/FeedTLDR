"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/feedtldr/logo";
import { Notice } from "@/components/feedtldr/notice";
import { Spinner } from "@/components/feedtldr/spinner";
import { Turnstile } from "@/components/feedtldr/turnstile";
import { useAuth } from "@/components/providers";
import { refreshCurrentUser, sendVerification } from "@/lib/firebase";
import {
  clearPendingSignup,
  loadPendingSignup,
  registerAccount,
  requestSignupChallenge,
  savePendingSignup,
  turnstileConfigured,
  type PendingSignup,
} from "@/lib/signup";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const attempted = useRef(false);
  const [busy, setBusy] = useState(false);
  const [needsChallenge, setNeedsChallenge] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [securityKey, setSecurityKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  async function completeAccount(silentIfPending = false) {
    setBusy(true);
    setNotice(null);
    try {
      const current = await refreshCurrentUser();
      if (!current) {
        throw new Error("Log in again to finish setting up your account.");
      }
      if (!current.emailVerified) {
        if (!silentIfPending) {
          setNotice("Not verified yet. Open the email link, then try again.");
        }
        return;
      }

      const stored = loadPendingSignup();
      let pending: PendingSignup =
        stored && stored.email.toLowerCase() === current.email?.toLowerCase()
          ? stored
          : {
              email: current.email ?? "",
              name: current.displayName ?? "",
              avatar: current.photoURL ?? "",
              isGoogleAuth: current.providerData.some(
                (provider) => provider.providerId === "google.com"
              ),
              challenge: "",
            };

      if (turnstileConfigured && !pending.challenge) {
        if (!turnstileToken) {
          setNeedsChallenge(true);
          throw new Error("Complete the security check to finish signup.");
        }
        pending = {
          ...pending,
          challenge: await requestSignupChallenge(
            current.email ?? "",
            turnstileToken
          ),
        };
        savePendingSignup(pending);
      }

      const result = await registerAccount(pending);
      clearPendingSignup();
      router.replace(result.already_registered ? "/app" : "/onboarding");
    } catch (err) {
      const text = String(err).replace(/^Error:\s*/, "");
      if (/signup security check|security check expired/i.test(text)) {
        const stored = loadPendingSignup();
        if (stored) savePendingSignup({ ...stored, challenge: "" });
        setNeedsChallenge(true);
        setTurnstileToken(null);
        setSecurityKey((value) => value + 1);
      }
      setNotice(text);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!loading && user && !attempted.current) {
      attempted.current = true;
      void completeAccount(true);
    }
    // completeAccount intentionally runs once after Firebase restores the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Spinner label="Loading" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
        <Logo />
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Log in to verify your email</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Go to login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-pastel-blue text-pastel-blue-foreground">
            <EnvelopeSimple className="size-5" aria-hidden="true" />
          </div>
          <CardTitle>Verify your email</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Check your inbox or spam folder for the link sent to{" "}
            <strong className="break-all text-foreground">{user.email}</strong>.
          </p>

          {needsChallenge && (
            <Turnstile
              key={securityKey}
              onTokenChange={setTurnstileToken}
            />
          )}

          {notice && (
            <Notice role="status" tone="info" filled>
              {notice}
            </Notice>
          )}

          <Button
            onClick={() => void completeAccount(false)}
            disabled={busy || (needsChallenge && !turnstileToken)}
          >
            {busy && <Spinner />}
            {busy ? "Checking…" : "Check verification"}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setNotice(null);
              try {
                await sendVerification(user);
                setNotice("Verification email sent.");
              } catch {
                setNotice("Unable to resend. Try again in a minute.");
              }
            }}
          >
            Resend email
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
