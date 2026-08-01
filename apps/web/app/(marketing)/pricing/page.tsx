"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/providers";
import { api } from "@/lib/api/client";
import { formatCount } from "@/lib/format";
import { useBillingUsage, useMe, usePlans } from "@/lib/hooks";

const PLAN_ORDER = ["free", "basic", "pro"];

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const plans = usePlans();
  const me = useMe(Boolean(user));
  const usage = useBillingUsage(Boolean(user));
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  async function checkout(priceId: string | null | undefined, planId: string) {
    if (!user) {
      router.push("/signup");
      return;
    }
    if (!priceId) return;
    setBusyPlan(planId);
    const result = await api.POST("/v1/billing/checkout", {
      body: { price_id: priceId },
    });
    setBusyPlan(null);
    if (result.data?.url) {
      window.location.assign(result.data.url);
    } else {
      toast.error("Could not start checkout. Try again.");
    }
  }

  async function openPortal() {
    const result = await api.POST("/v1/billing/portal");
    if (result.data?.url) window.location.assign(result.data.url);
    else toast.error("Could not open the billing portal.");
  }

  const ordered = (plans.data?.plans ?? [])
    .slice()
    .sort((a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 pt-10 pb-24">
      <header className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold sm:text-5xl">Pricing</h1>
        <p className="max-w-lg text-muted-foreground" style={{ textWrap: "pretty" }}>
          Start free. Upgrade when you want more accounts, more posts per
          summary, and more credits.
        </p>
        <div className="flex items-center gap-1 self-start rounded-full bg-secondary p-1">
          {(["month", "year"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setInterval(option)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45 ${
                interval === option
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option === "month" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>
      </header>

      {plans.isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="h-72 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {ordered.map((plan) => {
            const price =
              interval === "month" ? plan.price_month : plan.price_year;
            const priceId =
              interval === "month" ? plan.price_id_month : plan.price_id_year;
            const isCurrent = me.data?.plan === plan.id;
            const features = [
              `${formatCount(plan.max_followers)} accounts to follow`,
              `${formatCount(plan.max_tweets_per_generation)} posts per summary`,
              `${formatCount(plan.max_credits)} credits per month`,
              "Daily email newsletter",
              "Audio summaries",
            ];
            return (
              <Card
                key={plan.id}
                className={plan.id === "pro" ? "border-foreground/40" : undefined}
              >
                <CardHeader>
                  <CardTitle className="capitalize">{plan.id}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-6">
                  <p className="text-3xl font-semibold tabular-nums">
                    ${price ?? 0}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / {interval}
                    </span>
                  </p>
                  <ul className="flex flex-col gap-2">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-pastel-green-foreground" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    {isCurrent ? (
                      plan.id === "free" ? (
                        <Button variant="outline" className="w-full" disabled>
                          Current plan
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={openPortal}
                        >
                          Manage subscription
                        </Button>
                      )
                    ) : plan.id === "free" ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          user ? openPortal() : router.push("/signup")
                        }
                      >
                        {user ? "Downgrade in portal" : "Start free"}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        disabled={busyPlan === plan.id}
                        onClick={() => checkout(priceId, plan.id)}
                      >
                        {busyPlan === plan.id ? (
                          <CircleNotch className="animate-spin" />
                        ) : null}
                        {user ? `Switch to ${plan.id}` : "Get started"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {user && usage.data && (
        <section className="flex max-w-xl flex-col gap-5 border-t pt-10">
          <h2 className="text-xl font-semibold">Your usage this period</h2>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-sm">
              <span>Credits</span>
              <span className="tabular-nums text-muted-foreground">
                {usage.data.credits.monthly_limit +
                  usage.data.credits.prepaid_limit -
                  usage.data.credits.monthly_left -
                  usage.data.credits.prepaid_left}{" "}
                of{" "}
                {usage.data.credits.monthly_limit +
                  usage.data.credits.prepaid_limit}{" "}
                used
              </span>
            </div>
            <Progress
              value={
                ((usage.data.credits.monthly_limit +
                  usage.data.credits.prepaid_limit -
                  usage.data.credits.monthly_left -
                  usage.data.credits.prepaid_left) /
                  Math.max(
                    1,
                    usage.data.credits.monthly_limit +
                      usage.data.credits.prepaid_limit
                  )) *
                100
              }
            />
          </div>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Summaries</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {usage.data.usage.n_generations}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Newsletters</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {usage.data.usage.n_newsletters_sent}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Chat messages</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {usage.data.usage.n_chat_messages}
              </dd>
            </div>
          </dl>
        </section>
      )}
    </main>
  );
}
