"use client";

import { Check } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "./spinner";
import { formatCount } from "@/lib/format";
import { planName } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/api/types";

export type BillingInterval = "month" | "year";

/** What the button on a plan card does, given who is looking at it. */
export type PlanIntent = "signup" | "checkout" | "portal" | "none";

const FEATURED_PLAN = "pro";
const FREE_PLAN = "free";

/**
 * The single place that decides what a plan card offers. Extracted from the
 * markup because the rule ("current free plan is a dead end, current paid plan
 * goes to the portal, everything else is a checkout") is the interesting part.
 */
export function planAction(
  plan: Plan,
  { isSignedIn, isCurrent }: { isSignedIn: boolean; isCurrent: boolean }
): { label: string; intent: PlanIntent } {
  const isFree = plan.id === FREE_PLAN;

  if (!isSignedIn) {
    return {
      label: isFree ? "Start free trial" : "Get started",
      intent: "signup",
    };
  }
  if (isCurrent) {
    return isFree
      ? { label: "Current trial", intent: "none" }
      : { label: "Manage subscription", intent: "portal" };
  }
  return isFree
    ? { label: "Trial for new accounts", intent: "none" }
    : { label: `Switch to ${planName(plan.id)}`, intent: "checkout" };
}

function planFeatures(plan: Plan): string[] {
  if (plan.id === FREE_PLAN) {
    return [
      `${formatCount(plan.max_followers)} accounts to follow`,
      `${formatCount(plan.max_tweets_per_generation)} posts per summary`,
      `${formatCount(plan.max_credits)} one-time trial credits`,
      "Credits cover summaries, chat, and weekday newsletters",
      "Audio summaries",
      "No card required",
    ];
  }
  return [
    `${formatCount(plan.max_followers)} accounts to follow`,
    `${formatCount(plan.max_tweets_per_generation)} posts per summary`,
    `${formatCount(plan.max_credits)} credits per month`,
    "Daily email newsletter",
    "Audio summaries",
  ];
}

export function PlanCard({
  plan,
  interval,
  isSignedIn,
  isCurrent,
  availableCredits,
  isBusy,
  onAction,
}: {
  plan: Plan;
  interval: BillingInterval;
  isSignedIn: boolean;
  isCurrent: boolean;
  availableCredits?: number;
  isBusy: boolean;
  onAction: (intent: PlanIntent, priceId: string | null | undefined) => void;
}) {
  const price = interval === "month" ? plan.price_month : plan.price_year;
  const priceId =
    interval === "month" ? plan.price_id_month : plan.price_id_year;
  const action = planAction(plan, { isSignedIn, isCurrent });
  const isFree = plan.id === FREE_PLAN;
  const trialComplete = isFree && isCurrent && (availableCredits ?? 1) < 3;
  // One filled button per row: the paid plan the visitor does not have yet.
  const isPrimaryAction = !isCurrent && plan.id !== FREE_PLAN;

  return (
    <Card
      aria-current={isCurrent ? "true" : undefined}
      className={cn(
        isCurrent && "border-foreground",
        !isCurrent && plan.id === FEATURED_PLAN && "border-foreground/40"
      )}
    >
      <CardHeader>
        <CardTitle>{planName(plan.id)}</CardTitle>
        {isCurrent && (
          <CardAction>
            <Badge>Current plan</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <p className="text-3xl font-semibold tabular-nums">
          ${price ?? 0}
          <span className="text-sm font-normal text-muted-foreground">
            {isFree
              ? ` · ${formatCount(plan.max_credits)} credits total`
              : ` / ${interval}`}
          </span>
        </p>
        <ul className="flex flex-col gap-2">
          {planFeatures(plan).map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check
                className="mt-0.5 size-4 shrink-0 text-pastel-green-foreground"
                aria-hidden="true"
              />
              {feature}
            </li>
          ))}
        </ul>
        <div className="mt-auto">
          <Button
            className="w-full"
            variant={isPrimaryAction ? "default" : "outline"}
            disabled={action.intent === "none" || isBusy}
            onClick={() => onAction(action.intent, priceId)}
          >
            {isBusy && <Spinner />}
            {trialComplete ? "Trial credits used" : action.label}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
