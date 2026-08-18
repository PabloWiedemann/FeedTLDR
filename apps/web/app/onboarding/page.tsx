"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  AccountsField,
  VerifyAccountsButton,
} from "@/components/feedtldr/accounts-field";
import { Logo } from "@/components/feedtldr/logo";
import { OnboardingSteps } from "@/components/feedtldr/onboarding-steps";
import { Spinner } from "@/components/feedtldr/spinner";
import { useAuth } from "@/components/providers";
import { track } from "@/lib/analytics";
import { logout } from "@/lib/firebase";
import { useAccounts, useMe, useSettings } from "@/lib/api/queries";
import { useUpdateMe, useUpdateSettings } from "@/lib/api/mutations";
import { useSyncedState } from "@/lib/use-synced-state";

const STEPS = ["Accounts", "Verify", "Newsletter"] as const;
const LAST_STEP = STEPS.length - 1;

function StepCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground text-pretty">
          {description}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

function SignedInAs({ email }: { email: string }) {
  const router = useRouter();
  return (
    <p className="text-xs text-muted-foreground">
      Signed in as {email} ·{" "}
      <Button
        variant="link"
        size="xs"
        className="h-auto p-0 text-xs"
        onClick={async () => {
          await logout();
          router.replace("/login");
        }}
      >
        Not you? Sign out
      </Button>
    </p>
  );
}

/** 3-step onboarding (legacy pages/onboarding.py): accounts → verify → email. */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const signedIn = Boolean(user);
  const me = useMe(signedIn);
  const accounts = useAccounts(signedIn);
  const settings = useSettings(signedIn);
  const updateSettings = useUpdateSettings();
  const updateMe = useUpdateMe();

  // The saved step is authoritative on return; local state drives navigation.
  const [step, setStep] = useSyncedState(
    me.data?.onboarded === false ? me.data : undefined,
    (data) => Math.min(data.onboarding_step, LAST_STEP),
    0
  );
  const [email, setEmail] = useSyncedState(
    settings.data,
    (data) => data.newsletter_email ?? "",
    ""
  );

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (me.data?.onboarded) router.replace("/app");
  }, [me.data, router]);

  const hasAccounts = (accounts.data?.accounts.length ?? 0) > 0;
  const hasVerified = (accounts.data?.verified_accounts.length ?? 0) > 0;

  function goTo(next: number) {
    setStep(next);
    updateMe.mutate({ onboarding_step: next });
  }

  function finish() {
    if (email.trim() !== "") {
      updateSettings.mutate({ newsletter_email: email.trim() });
    }
    updateMe.mutate(
      { onboarded: true, onboarding_step: LAST_STEP },
      {
        onSuccess: () => {
          track("onboarding_completed");
          router.replace("/app");
        },
      }
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center gap-10 px-6 py-16">
      <div className="flex flex-col items-center gap-2">
        <Logo />
        {user?.email && <SignedInAs email={user.email} />}
      </div>

      <OnboardingSteps steps={STEPS} current={step} />

      {step === 0 && (
        <StepCard
          title="Which accounts should we follow for you?"
          description="Add the X accounts whose posts you want summarized. You can change this anytime in settings."
        >
          <AccountsField enabled={signedIn} />
          <div className="flex justify-end">
            <Button onClick={() => goTo(1)} disabled={!hasAccounts}>
              Continue
            </Button>
          </div>
        </StepCard>
      )}

      {step === 1 && (
        <StepCard
          title="Verify your accounts"
          description="We check that each account exists on X before scraping it. At least one verified account is needed to generate summaries."
        >
          <AccountsField enabled={signedIn} />
          <div className="flex">
            <VerifyAccountsButton enabled={signedIn} />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => goTo(0)}>
              Back
            </Button>
            <Button onClick={() => goTo(2)} disabled={!hasVerified}>
              Continue
            </Button>
          </div>
        </StepCard>
      )}

      {step === 2 && (
        <StepCard
          title="Where should the daily email go?"
          description="Weekday mornings around 7am in your timezone, we generate your summary and send it here. Leave it empty to skip the newsletter."
        >
          <Field>
            <FieldLabel htmlFor="newsletter-email">Newsletter email</FieldLabel>
            <Input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => goTo(1)}>
              Back
            </Button>
            <Button onClick={finish} disabled={updateMe.isPending}>
              {updateMe.isPending && <Spinner />}
              Finish setup
            </Button>
          </div>
        </StepCard>
      )}
    </main>
  );
}
