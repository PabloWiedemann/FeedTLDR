"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleNotch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CreditBadge } from "./credit-badge";
import { useGenerationCost, useSettings, useStartGeneration } from "@/lib/hooks";

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
  const [promptDraft, setPromptDraft] = useState<string | null>(null);
  const settings = useSettings(open);
  const cost = useGenerationCost(fetchLatest, open);
  const start = useStartGeneration();

  const effectivePrompt =
    promptDraft !== null ? promptDraft : (settings.data?.ai_prompt ?? "");

  const remaining = cost.data
    ? cost.data.credits.monthly_left + cost.data.credits.prepaid_left
    : undefined;

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
            <div className="flex items-center justify-between gap-4 rounded-xl bg-secondary px-4 py-3">
              <Label htmlFor="fetch-latest" className="font-normal">
                Fetch latest posts
              </Label>
              <Switch
                id="fetch-latest"
                checked={fetchLatest}
                onCheckedChange={setFetchLatest}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="gen-prompt">AI prompt for this run</Label>
            <Textarea
              id="gen-prompt"
              value={effectivePrompt}
              onChange={(e) => setPromptDraft(e.target.value)}
              rows={5}
              placeholder="Loading your saved prompt…"
            />
            <p className="text-xs text-muted-foreground">
              Applies to this generation only. Save a default in settings.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border px-4 py-3">
            <span className="text-sm">This action costs</span>
            {cost.data ? (
              <CreditBadge cost={cost.data.cost} remaining={remaining} />
            ) : (
              <CircleNotch className="size-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {cost.data?.blockers.map((blocker) => (
            <p key={blocker} role="alert" className="text-sm font-medium text-destructive">
              {BLOCKER_COPY[blocker] ?? blocker}
            </p>
          ))}

          <Button
            size="lg"
            disabled={start.isPending || (cost.data ? !cost.data.can_generate : true)}
            onClick={() =>
              start.mutate(
                {
                  fetch_latest: fetchLatest,
                  prompt:
                    promptDraft !== null && promptDraft !== settings.data?.ai_prompt
                      ? promptDraft
                      : undefined,
                },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    onStarted();
                  },
                }
              )
            }
          >
            {start.isPending ? (
              <>
                <CircleNotch className="animate-spin" /> Starting…
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
