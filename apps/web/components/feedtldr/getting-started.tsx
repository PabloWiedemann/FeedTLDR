"use client";

import Link from "next/link";
import { ArrowRight, Check, Circle, X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function StepBody({
  title,
  description,
  done,
  optional,
}: {
  title: string;
  description: string;
  done: boolean;
  optional: boolean;
}) {
  return (
    <>
      {done ? (
        // Same two-tone pair as the verified account chip: mint disc,
        // deep-green glyph.
        <span
          className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-pastel-green text-pastel-green-foreground"
          aria-hidden="true"
        >
          <Check weight="bold" className="size-3" />
        </span>
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
    </>
  );
}

type SetupStepProps = {
  title: string;
  description: string;
  done: boolean;
  optional?: boolean;
  className?: string;
} & ( // A step either navigates or acts — exactly one of the two.
  | { href: string; onClick?: never }
  | { href?: never; onClick: () => void }
);

function SetupStep({
  href,
  onClick,
  title,
  description,
  done,
  optional = false,
  className,
}: SetupStepProps) {
  const classes = cn(
    "group/step focus-ring press flex items-start gap-3 p-5 text-left transition-colors duration-150 ease-brand hover:bg-accent sm:p-6",
    className
  );
  const body = (
    <StepBody
      title={title}
      description={description}
      done={done}
      optional={optional}
    />
  );
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={classes}>
      {body}
    </button>
  );
}

/**
 * Setup checklist shown above the example brief once accounts exist but no
 * real brief does. The first two steps deep-link into settings; the last one
 * opens the generate dialog. Dismissable — the page owns the persistence.
 */
export function GettingStarted({
  accountsDone,
  newsletterDone,
  onGenerate,
  onDismiss,
  className,
}: {
  accountsDone: boolean;
  newsletterDone: boolean;
  onGenerate: () => void;
  onDismiss: () => void;
  className?: string;
}) {
  const doneCount = Number(accountsDone) + Number(newsletterDone);
  return (
    <Card className={cn("gap-3 border-none p-0 pt-3", className)}>
      <div className="flex items-center justify-between gap-4 pr-3 pl-5 sm:pl-6">
        <h2 className="text-section">Finish your setup</h2>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground tabular-nums">
            {doneCount} of 3 done
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground"
            onClick={onDismiss}
            aria-label="Dismiss the setup list"
          >
            <X />
          </Button>
        </div>
      </div>
      <div className="grid border-t sm:grid-cols-3 sm:divide-x">
        <SetupStep
          href="/app/settings/accounts"
          title="Choose accounts to follow"
          description="We make your daily brief from their posts."
          done={accountsDone}
          className="sm:rounded-bl-card"
        />
        <SetupStep
          href="/app/settings/email"
          title="Get the brief by email"
          description="We send it to your inbox on weekday mornings."
          done={newsletterDone}
          optional
          className="border-t sm:border-t-0"
        />
        <SetupStep
          onClick={onGenerate}
          title="Generate your first brief"
          description="Your brief replaces this example."
          done={false}
          className="border-t sm:border-t-0 max-sm:rounded-b-card sm:rounded-br-card"
        />
      </div>
    </Card>
  );
}
