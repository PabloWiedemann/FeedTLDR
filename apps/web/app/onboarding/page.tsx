"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  AccountsField,
  useAccountTags,
} from "@/components/feedtldr/accounts-field";
import { Logo } from "@/components/feedtldr/logo";
import { Notice } from "@/components/feedtldr/notice";
import { OnboardingSteps } from "@/components/feedtldr/onboarding-steps";
import { Spinner } from "@/components/feedtldr/spinner";
import { SurveyQuestion } from "@/components/feedtldr/survey-question";
import { useAuth } from "@/components/providers";
import { track } from "@/lib/analytics";
import { logout } from "@/lib/firebase";
import { useMe, useSettings } from "@/lib/api/queries";
import {
  useUpdateMe,
  useUpdateSettings,
  useVerifyAccounts,
} from "@/lib/api/mutations";
import { onboardingPreview } from "@/lib/preview";
import { useSyncedState } from "@/lib/use-synced-state";

const STEPS = [
  "Your role",
  "Your goal",
  "What to follow",
  "Add accounts",
  "Daily email",
] as const;
const LAST_STEP = STEPS.length - 1;
const ACCOUNTS_STEP = 3;
const EMAIL_STEP = 4;

/** The "About you" questions; answers land in customers/{uid}.onboarding_survey. */
const SURVEY_QUESTIONS = [
  {
    key: "role",
    label: "What best describes you?",
    options: [
      "Founder",
      "Engineer",
      "Marketer",
      "Investor",
      "Creator",
      "Student",
    ],
    multiple: false,
  },
  {
    key: "goal",
    label: "What do you want from FeedTLDR?",
    options: [
      "Save time on X",
      "Not miss important posts",
      "Track my industry",
      "See what people say about my product",
      "Research a topic",
    ],
    multiple: false,
  },
  {
    key: "topics",
    label: "What do you want to follow?",
    options: [
      "My product or brand",
      "My industry",
      "AI & tech",
      "Finance & crypto",
      "News & politics",
      "Sports",
    ],
    multiple: true,
  },
] as const;
const LAST_SURVEY_STEP = SURVEY_QUESTIONS.length - 1;

/** One selected-options list per question; `other` set means "Other" is on. */
type SurveyAnswer = { selected: string[]; other?: string };
type SurveyAnswers = Record<string, SurveyAnswer>;

/** Saved answers hold plain strings; anything off the option list was typed. */
function toSurveyAnswers(
  saved: Record<string, string | string[]>
): SurveyAnswers {
  const answers: SurveyAnswers = {};
  for (const question of SURVEY_QUESTIONS) {
    const raw = saved[question.key];
    if (raw === undefined) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    const known = (question.options as readonly string[]).filter((option) =>
      values.includes(option)
    );
    const typed = values.find(
      (entry) => !(question.options as readonly string[]).includes(entry)
    );
    answers[question.key] = { selected: known, other: typed };
  }
  return answers;
}

/**
 * Seeded Fisher–Yates (mulberry32), so no option benefits from always being
 * the first tap. One seed per visit keeps the order stable across re-renders.
 */
function seededShuffle(values: readonly string[], seed: number): string[] {
  const result = [...values];
  let state = seed || 1;
  for (let i = result.length - 1; i > 0; i--) {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const rand = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    const j = Math.floor(rand * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function StepCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-h-0 w-full overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {/* py-1 keeps focus rings clear of the scrollport's clip edges. */}
      <CardContent className="flex min-h-0 flex-col gap-5 overflow-y-auto py-1">
        {description && (
          <p className="text-sm text-muted-foreground text-pretty">
            {description}
          </p>
        )}
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

/** 5-step onboarding: three about-you questions → add accounts (verified
 * inline) → optional daily email. */
export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const signedIn = Boolean(user);
  const me = useMe(signedIn);
  const settings = useSettings(signedIn);
  const { items, unverifiedCount } = useAccountTags(signedIn);
  const verifyAccounts = useVerifyAccounts();
  const updateSettings = useUpdateSettings();
  const updateMe = useUpdateMe();

  // The saved step is authoritative on return; local state drives navigation.
  const [step, setStep] = useSyncedState(
    me.data?.onboarded === false ? me.data : undefined,
    (data) => Math.min(data.onboarding_step, LAST_STEP),
    0
  );
  const [answers, setAnswers] = useSyncedState(
    me.data?.onboarded === false ? me.data : undefined,
    (data) => toSurveyAnswers(data.onboarding_survey),
    {} as SurveyAnswers
  );
  const [email, setEmail] = useSyncedState(
    settings.data,
    (data) => data.newsletter_email ?? "",
    ""
  );
  const [skipEmail, setSkipEmail] = useState(false);

  // Options shuffle per visit to spread the quick-tap bias evenly. The seed
  // only takes effect once auth resolves (client-only), so the first client
  // render still matches the server-rendered HTML.
  const [visitSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const uid = user?.uid;
  const optionOrder = useMemo(() => {
    if (!uid) return {} as Record<string, string[]>;
    return Object.fromEntries(
      SURVEY_QUESTIONS.map((question, index) => [
        question.key,
        seededShuffle(question.options, visitSeed + index),
      ])
    );
  }, [uid, visitSeed]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (me.data?.onboarded && !onboardingPreview) router.replace("/app");
  }, [me.data, router]);

  const hasAccounts = items.length > 0;
  const question = step <= LAST_SURVEY_STEP ? SURVEY_QUESTIONS[step] : undefined;

  function goTo(next: number) {
    setStep(next);
    if (!onboardingPreview) updateMe.mutate({ onboarding_step: next });
  }

  /** This question's saveable answer; a bare "Other" counts as answered. */
  function answerValues(
    question: (typeof SURVEY_QUESTIONS)[number]
  ): string | string[] | undefined {
    const answer = answers[question.key];
    if (!answer) return undefined;
    const typed =
      answer.other === undefined ? [] : [answer.other.trim() || "Other"];
    const values = [...answer.selected, ...typed];
    if (values.length === 0) return undefined;
    return question.multiple ? values : values[0];
  }

  /** Saves this question's answer (if any) while moving on; all optional. */
  function continueSurvey() {
    const question = SURVEY_QUESTIONS[step];
    const next = step + 1;
    setStep(next);
    if (onboardingPreview) return;
    if (step === LAST_SURVEY_STEP) {
      const survey = Object.fromEntries(
        SURVEY_QUESTIONS.map((entry) => [entry.key, answerValues(entry)]).filter(
          ([, values]) => values !== undefined
        )
      );
      if (Object.keys(survey).length > 0) {
        track("onboarding_survey_submitted", survey);
      }
    }
    const answer = answerValues(question);
    updateMe.mutate(
      answer === undefined
        ? { onboarding_step: next }
        : { onboarding_survey: { [question.key]: answer }, onboarding_step: next }
    );
  }

  /** Checks unchecked accounts against X, then moves on when one is found. */
  function verifyAndContinue() {
    if (unverifiedCount === 0) {
      goTo(EMAIL_STEP);
      return;
    }
    verifyAccounts.mutate(undefined, {
      onSuccess: (data) => {
        if (data.verified_accounts.length > 0) goTo(EMAIL_STEP);
      },
    });
  }

  function finish() {
    if (onboardingPreview) {
      router.replace("/app");
      return;
    }
    if (skipEmail && (settings.data?.newsletter_email ?? "") !== "") {
      updateSettings.mutate({ newsletter_email: "" });
    } else if (email.trim() !== "") {
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
    <main className="mx-auto flex h-dvh w-full max-w-xl flex-col items-center gap-8 overflow-hidden px-6 pt-16">
      <div className="flex flex-col items-center gap-2">
        <Logo />
        {user?.email && <SignedInAs email={user.email} />}
        {onboardingPreview && (
          <p className="text-xs text-muted-foreground">
            Preview mode — steps and finish are not saved
          </p>
        )}
      </div>

      {/* The page itself never scrolls: the card caps at the space between
          header and nav, and overflow scrolls inside the card only. */}
      <div className="flex min-h-0 w-full flex-1 flex-col">
        {question && (
          <StepCard title={question.label}>
            <SurveyQuestion
              key={question.key}
              hideLabel
              label={question.label}
              options={optionOrder[question.key] ?? question.options}
              multiple={question.multiple}
              value={answers[question.key]?.selected ?? []}
              otherValue={answers[question.key]?.other}
              onChange={(selected, other) =>
                setAnswers({ ...answers, [question.key]: { selected, other } })
              }
            />
          </StepCard>
        )}

        {step === ACCOUNTS_STEP && (
          <StepCard
            title="Which accounts should we follow for you?"
            description="Add the X accounts whose posts you want summarized. We check that each account exists on X. You can change the list anytime in settings."
          >
            <AccountsField
              enabled={signedIn}
              withActions
              withVerify={false}
              listClassName="min-h-0"
            />
          </StepCard>
        )}

        {step === EMAIL_STEP && (
        <StepCard
          title="Want your daily summary by email?"
          description="This is optional. Weekday mornings around 7am in your timezone, we send your summary to this address."
        >
          <Field>
            <FieldLabel htmlFor="newsletter-email">Newsletter email</FieldLabel>
            <Input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSkipEmail(false);
              }}
              placeholder="you@example.com"
            />
          </Field>
          {skipEmail ? (
            <Notice tone="info">
              Got it — no emails. You can turn them on in settings at any time.
            </Notice>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => {
                setEmail("");
                setSkipEmail(true);
              }}
            >
              I don&apos;t want emails
            </Button>
          )}
        </StepCard>
      )}

      </div>

      {/* One stationary bottom block for every step: progress bar over the
          Back/primary buttons, so nothing moves when a card changes size. */}
      <div className="flex w-full flex-col gap-5 pb-6">
        <OnboardingSteps steps={STEPS} current={step} />
        <nav
          aria-label="Onboarding navigation"
          className="flex w-full items-center justify-between gap-3"
        >
          <Button
            variant="ghost"
            onClick={() => goTo(step - 1)}
            className={step === 0 ? "invisible" : undefined}
          >
            Back
          </Button>
          {step <= LAST_SURVEY_STEP && (
            <Button onClick={continueSurvey}>Continue</Button>
          )}
          {step === ACCOUNTS_STEP && (
            <Button
              onClick={verifyAndContinue}
              disabled={!hasAccounts || verifyAccounts.isPending}
            >
              {verifyAccounts.isPending && <Spinner />}
              {unverifiedCount > 0 ? "Verify & continue" : "Continue"}
            </Button>
          )}
          {step === EMAIL_STEP && (
            <Button onClick={finish} disabled={updateMe.isPending}>
              {updateMe.isPending && <Spinner />}
              {email.trim() === "" ? "Finish without email" : "Finish setup"}
            </Button>
          )}
        </nav>
      </div>
    </main>
  );
}
