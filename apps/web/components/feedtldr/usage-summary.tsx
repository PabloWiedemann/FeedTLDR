import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { creditsTotal, creditsUsed, creditsUsedPercent } from "@/lib/credits";
import { formatCount } from "@/lib/format";
import type { BillingUsage } from "@/lib/api/types";

/** What the current billing period has consumed so far (pricing page). */
export function UsageSummary({ usage }: { usage: BillingUsage }) {
  const { credits } = usage;

  return (
    <section aria-labelledby="usage-summary-heading">
      <Card>
        <CardContent className="flex flex-col gap-5">
          <h2 id="usage-summary-heading" className="text-section">
            {usage.plan === "free"
              ? "Your free trial usage"
              : "Your usage this period"}
          </h2>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-sm">
              <span>Credits</span>
              <span className="tabular-nums text-muted-foreground">
                {formatCount(creditsUsed(credits))} of{" "}
                {formatCount(creditsTotal(credits))} used
              </span>
            </div>
            <Progress
              value={creditsUsedPercent(credits)}
              className="bg-secondary"
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
