"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CircleNotch, SealCheck } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/feedtldr/logo";
import { TagInput } from "@/components/feedtldr/tag-input";
import { useAuth } from "@/components/providers";
import {
  useAccounts,
  useAddAccounts,
  useMe,
  useRemoveAccount,
  useSettings,
  useUpdateMe,
  useUpdateSettings,
  useVerifyAccounts,
} from "@/lib/hooks";

const STEPS = ["Accounts", "Verify", "Newsletter"] as const;

/** 3-step onboarding (legacy pages/onboarding.py): accounts → verify → email. */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const me = useMe(Boolean(user));
  const accounts = useAccounts(Boolean(user));
  const settings = useSettings(Boolean(user));
  const addAccounts = useAddAccounts();
  const removeAccount = useRemoveAccount();
  const verifyAccounts = useVerifyAccounts();
  const updateSettings = useUpdateSettings();
  const updateMe = useUpdateMe();

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (me.data?.onboarded) router.replace("/app");
  }, [me.data, router]);

  // Resume the saved step / hydrate the email field (adjust-during-render)
  const [seededStepFrom, setSeededStepFrom] = useState<typeof me.data>(undefined);
  if (me.data && !me.data.onboarded && me.data !== seededStepFrom) {
    setSeededStepFrom(me.data);
    setStep(Math.min(me.data.onboarding_step, 2));
  }
  const [seededEmailFrom, setSeededEmailFrom] =
    useState<typeof settings.data>(undefined);
  if (settings.data && settings.data !== seededEmailFrom) {
    setSeededEmailFrom(settings.data);
    setEmail(settings.data.newsletter_email ?? "");
  }

  const verified = new Set(accounts.data?.verified_accounts ?? []);
  const items = (accounts.data?.accounts ?? []).map((handle) => ({
    value: handle,
    state: verified.has(handle) ? ("verified" as const) : ("unverified" as const),
  }));
  const hasVerified = items.some((i) => i.state === "verified");

  function goTo(next: number) {
    setStep(next);
    updateMe.mutate({ onboarding_step: next });
  }

  async function finish() {
    if (email.trim() !== "") {
      updateSettings.mutate({ newsletter_email: email.trim() });
    }
    updateMe.mutate(
      { onboarded: true, onboarding_step: 2 },
      { onSuccess: () => router.replace("/app") }
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center gap-10 px-6 py-16">
      <Logo />

      <ol className="flex items-center gap-3" aria-label="Onboarding progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`grid size-7 place-items-center rounded-full text-xs font-medium transition-colors duration-300 ${
                i < step
                  ? "bg-pastel-green text-pastel-green-foreground"
                  : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-sm ${i === step ? "font-medium" : "text-muted-foreground"}`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="h-px w-6 bg-border" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Which accounts should we follow for you?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <p className="text-sm text-muted-foreground">
              Add the X accounts whose posts you want summarized. You can change
              this anytime in settings.
            </p>
            <TagInput
              items={items}
              onAdd={(values) => addAccounts.mutate(values)}
              onRemove={(value) => removeAccount.mutate(value)}
            />
            <div className="flex justify-end">
              <Button onClick={() => goTo(1)} disabled={items.length === 0}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Verify your accounts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <p className="text-sm text-muted-foreground">
              We check that each account exists on X before scraping it. At
              least one verified account is needed to generate summaries.
            </p>
            <div className="flex flex-wrap gap-2">
              <TagInput
                items={items}
                onAdd={(values) => addAccounts.mutate(values)}
                onRemove={(value) => removeAccount.mutate(value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => verifyAccounts.mutate()}
              disabled={verifyAccounts.isPending}
            >
              {verifyAccounts.isPending ? (
                <CircleNotch className="animate-spin" />
              ) : (
                <SealCheck />
              )}
              Verify accounts
            </Button>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => goTo(0)}>
                Back
              </Button>
              <Button onClick={() => goTo(2)} disabled={!hasVerified}>
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Where should the daily email go?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <p className="text-sm text-muted-foreground">
              Weekday mornings around 7am in your timezone, we generate your
              summary and send it here. Leave it empty to skip the newsletter.
            </p>
            <div className="grid gap-2">
              <Label htmlFor="newsletter-email">Newsletter email</Label>
              <Input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => goTo(1)}>
                Back
              </Button>
              <Button onClick={finish} disabled={updateMe.isPending}>
                {updateMe.isPending ? (
                  <CircleNotch className="animate-spin" />
                ) : null}
                Finish setup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
