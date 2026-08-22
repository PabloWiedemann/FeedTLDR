import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Circle,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function SetupStep({
  href,
  title,
  description,
  done,
  optional = false,
  className,
}: {
  href: string;
  title: string;
  description: string;
  done: boolean;
  optional?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group/step focus-ring press flex items-start gap-3 p-5 transition-colors duration-150 ease-brand hover:bg-accent sm:p-6",
        className
      )}
    >
      {done ? (
        <CheckCircle
          weight="fill"
          className="mt-0.5 size-5 shrink-0 text-pastel-green-foreground"
          aria-hidden="true"
        />
      ) : (
        <Circle
          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      )}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          <span className={cn(done && "text-muted-foreground line-through")}>
            {title}
          </span>
          {optional && !done && (
            <Badge className="rounded-full bg-secondary text-muted-foreground">
              Optional
            </Badge>
          )}
        </span>
        <span className="text-sm text-muted-foreground text-pretty">
          {description}
        </span>
      </span>
      <ArrowRight
        className="mt-1 ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-brand group-hover/step:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

/**
 * Post-onboarding checklist shown above the demo feed until the account can
 * generate a brief of its own. Both steps deep-link into settings.
 */
export function GettingStarted({
  accountsDone,
  newsletterDone,
  className,
}: {
  accountsDone: boolean;
  newsletterDone: boolean;
  className?: string;
}) {
  const doneCount = Number(accountsDone) + Number(newsletterDone);
  return (
    <Card className={cn("gap-4 border-none p-0 pt-5", className)}>
      <div className="flex items-baseline justify-between gap-4 px-5 sm:px-6">
        <h2 className="text-section">Set up your feed</h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {doneCount} of 2 done
        </p>
      </div>
      <div className="grid border-t sm:grid-cols-2 sm:divide-x">
        <SetupStep
          href="/app/settings/accounts"
          title="Choose accounts to follow"
          description="Your daily brief is built from what they post."
          done={accountsDone}
          className="sm:rounded-bl-card"
        />
        <SetupStep
          href="/app/settings/email"
          title="Get the brief by email"
          description="Weekday mornings, in your inbox around 7am."
          done={newsletterDone}
          optional
          className="border-t sm:border-t-0 max-sm:rounded-b-card sm:rounded-br-card"
        />
      </div>
    </Card>
  );
}
