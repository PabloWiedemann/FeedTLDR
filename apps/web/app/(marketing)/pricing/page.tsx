"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageHeader } from "@/components/feedtldr/page-header";
import {
  PlanCard,
  type BillingInterval,
  type PlanIntent,
} from "@/components/feedtldr/plan-card";
import { UsageSummary } from "@/components/feedtldr/usage-summary";
import { useAuth } from "@/components/providers";
import { useBillingPortal, useCheckout } from "@/lib/api/mutations";
import { useBillingUsage, useMe, usePlans } from "@/lib/api/queries";

/** Cheapest first: the catalog is keyed by id, not ordered. */
const PLAN_ORDER = ["free", "basic", "pro"];

const INTERVAL_LABELS: Record<BillingInterval, string> = {
  month: "Monthly",
  year: "Yearly",
};

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const plans = usePlans();
  const me = useMe(Boolean(user));
  const usage = useBillingUsage(Boolean(user));
  const checkout = useCheckout();
  const portal = useBillingPortal();
  const [interval, setInterval] = useState<BillingInterval>("month");

  function handleAction(intent: PlanIntent, priceId: string | null | undefined) {
    if (intent === "signup") return router.push("/signup");
    if (intent === "portal") return portal.mutate();
    if (intent === "checkout" && priceId) checkout.mutate(priceId);
  }

  const orderedPlans = (plans.data?.plans ?? [])
    .slice()
    .sort((a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 pt-10 pb-24">
      <PageHeader
        title="Pricing"
        description="Start with 50 one-time trial credits. No card, no time limit. Choose Basic or Pro when you need more."
      >
        <ToggleGroup
          type="single"
          value={interval}
          onValueChange={(value) => value && setInterval(value as BillingInterval)}
          aria-label="Billing interval"
          className="self-start bg-secondary p-1"
        >
          {(Object.keys(INTERVAL_LABELS) as BillingInterval[]).map((option) => (
            <ToggleGroupItem key={option} value={option}>
              {INTERVAL_LABELS[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.isLoading
          ? PLAN_ORDER.map((id) => <Card key={id} className="h-72 animate-pulse" />)
          : orderedPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                interval={interval}
                isSignedIn={Boolean(user)}
                isCurrent={me.data?.plan === plan.id}
                availableCredits={
                  me.data
                    ? me.data.credits.monthly_left + me.data.credits.prepaid_left
                    : undefined
                }
                isBusy={checkout.isPending || portal.isPending}
                onAction={handleAction}
              />
            ))}
      </div>

      {plans.isError && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm font-medium text-destructive">
            Could not load the plans.
          </p>
          <Button variant="outline" onClick={() => plans.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {user && usage.data && <UsageSummary usage={usage.data} />}
    </main>
  );
}
