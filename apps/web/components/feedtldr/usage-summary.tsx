import { Progress } from "@/components/ui/progress";
import { creditsTotal, creditsUsed, creditsUsedPercent } from "@/lib/credits";
import { formatCount } from "@/lib/format";
import type { BillingUsage } from "@/lib/api/types";

function UsageStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">
        {formatCount(value)}
      </dd>
    </div>
  );
}

/** What the current billing period has consumed so far (pricing page). */
export function UsageSummary({ usage }: { usage: BillingUsage }) {
  const { credits } = usage;

  return (
    <section className="flex max-w-xl flex-col gap-5 border-t pt-10">
      <h2 className="text-section">
        {usage.plan === "free" ? "Your free trial usage" : "Your usage this period"}
      </h2>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-sm">
          <span>Credits</span>
          <span className="tabular-nums text-muted-foreground">
            {formatCount(creditsUsed(credits))} of{" "}
            {formatCount(creditsTotal(credits))} used
          </span>
        </div>
        <Progress value={creditsUsedPercent(credits)} />
      </div>
      <dl className="grid grid-cols-3 gap-4 text-sm">
        <UsageStat label="Summaries" value={usage.usage.n_generations} />
        <UsageStat label="Newsletters" value={usage.usage.n_newsletters_sent} />
        <UsageStat label="Chat messages" value={usage.usage.n_chat_messages} />
      </dl>
    </section>
  );
}
