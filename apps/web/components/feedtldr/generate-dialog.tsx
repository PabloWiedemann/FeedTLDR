"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CreditBadge } from "./credit-badge";
import { Notice } from "./notice";
import { Spinner } from "./spinner";
import { useGenerationCost, useSettings } from "@/lib/api/queries";
import { useStartGeneration } from "@/lib/api/mutations";
import { creditsLeft } from "@/lib/credits";

/** Why the Generate button is unavailable, and what to do about it. */
const BLOCKER_COPY: Record<string, React.ReactNode> = {
  no_accounts: "Add accounts in settings before generating.",
  no_verified_accounts: "Verify at least one account in settings first.",
  insufficient_credits: (
    <>
      Not enough credits.{" "}
      <Link href="/pricing" className="text-link underline underline-offset-2">
        Upgrade your plan
      </Link>{" "}
      to continue.
    </>
  ),
};

/**
 * Generate dialog (legacy gen_dialog): fetch-latest toggle vs re-summarize,
 * optional prompt override, live credit cost, and blocker explanations.
 */
export function GenerateDialog({
  open,
  onOpenChange,
  hasPreviousData,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPreviousData: boolean;
  onStarted: () => void;
}) {
  const [fetchLatest, setFetchLatest] = useState(true);
  // null means "untouched", so the saved prompt keeps showing through.
  const [promptOverride, setPromptOverride] = useState<string | null>(null);
  const settings = useSettings(open);
  const cost = useGenerationCost(fetchLatest, open);
  const start = useStartGeneration();

  const savedPrompt = settings.data?.ai_prompt ?? "";
  const prompt = promptOverride ?? savedPrompt;
  const promptChanged = promptOverride !== null && promptOverride !== savedPrompt;

  function generate() {
    start.mutate(
      {
        fetch_latest: fetchLatest,
        prompt: promptChanged ? promptOverride : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onStarted();
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate a new summary</DialogTitle>
          <DialogDescription>
            {fetchLatest
              ? "Fetch the latest posts from your accounts and summarize them."
              : "Re-summarize the posts collected in your last generation."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {hasPreviousData && (
            <div className="flex items-center justify-between gap-4 rounded-field bg-secondary px-4 py-3">
              <FieldLabel htmlFor="fetch-latest" className="font-normal">
                Fetch latest posts
              </FieldLabel>
              <Switch
                id="fetch-latest"
                checked={fetchLatest}
                onCheckedChange={setFetchLatest}
              />
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="gen-prompt">AI prompt for this run</FieldLabel>
            <Textarea
              id="gen-prompt"
              value={prompt}
              onChange={(event) => setPromptOverride(event.target.value)}
              rows={5}
              placeholder="Loading your saved prompt…"
            />
            <FieldDescription className="text-xs">
              Applies to this generation only. Save a default in settings.
            </FieldDescription>
          </Field>

          <div className="flex items-center justify-between rounded-field border px-4 py-3">
            <span className="text-sm">This action costs</span>
            {cost.data ? (
              <CreditBadge
                cost={cost.data.cost}
                remaining={creditsLeft(cost.data.credits)}
              />
            ) : (
              <Spinner
                label="Calculating cost"
                className="size-4 text-muted-foreground"
              />
            )}
          </div>

          {cost.data?.blockers.map((blocker) => (
            <Notice key={blocker} tone="error">
              {BLOCKER_COPY[blocker] ?? blocker}
            </Notice>
          ))}

          <Button
            size="lg"
            disabled={start.isPending || !cost.data?.can_generate}
            onClick={generate}
          >
            {start.isPending ? (
              <>
                <Spinner /> Starting…
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
