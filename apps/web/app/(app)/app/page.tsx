"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppBar } from "@/components/feedtldr/app-bar";
import { AudioPill } from "@/components/feedtldr/audio-pill";
import { EmptyState } from "@/components/feedtldr/empty-state";
import { GenerateDialog } from "@/components/feedtldr/generate-dialog";
import { GenerationProgress } from "@/components/feedtldr/generation-progress";
import { Notice } from "@/components/feedtldr/notice";
import { PageHeader } from "@/components/feedtldr/page-header";
import {
  PostHoverPreviews,
  type SourcePost,
} from "@/components/feedtldr/post-hover-previews";
import { SettingsSheet } from "@/components/feedtldr/settings-sheet";
import { SourceDataView } from "@/components/feedtldr/source-data";
import { SummaryProse } from "@/components/feedtldr/summary-prose";
import { track } from "@/lib/analytics";
import {
  useFeed,
  useGenerationStatus,
  useMe,
  useSourceData,
} from "@/lib/api/queries";
import { cn } from "@/lib/utils";
import { useUpdateMe } from "@/lib/api/mutations";
import { generationResultKeys, queryKeys } from "@/lib/api/query-keys";

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-6 rounded-card bg-card p-6 sm:p-10">
      <Skeleton className="h-14 w-2/3" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-9 w-40 rounded-full" />
      <div className="flex flex-col gap-3 pt-8">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/**
 * Source data demoted to a quiet card row below the summary: it only
 * explains how the brief was made, so it stays folded until asked for.
 */
function SourceDataDisclosure() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-card bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "focus-ring flex w-full items-center justify-between gap-4 p-6 text-left transition-colors duration-150 ease-brand hover:bg-accent sm:px-8",
          open ? "rounded-t-card" : "rounded-card"
        )}
      >
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">Source data</span>
          <span className="text-sm text-muted-foreground text-pretty">
            The posts and accounts behind this brief.
          </span>
        </span>
        <CaretDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-brand",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="p-6 pt-0 sm:px-8 sm:pb-8">
          <SourceDataView enabled={open} />
        </div>
      )}
    </section>
  );
}

/**
 * Refreshes feed data and announces the outcome when a run finishes. The
 * pipeline has no completion callback, so the transition out of in_progress
 * is the only signal we get.
 */
function useGenerationCompletion(status: string | undefined, error?: string | null) {
  const queryClient = useQueryClient();
  const previousStatus = useRef<string | undefined>(undefined);

  useEffect(() => {
    const justFinished =
      previousStatus.current === "in_progress" &&
      status !== undefined &&
      status !== "in_progress";

    if (justFinished) {
      for (const queryKey of generationResultKeys) {
        void queryClient.invalidateQueries({ queryKey });
      }
      if (status === "success") {
        toast.success("Your new summary is ready");
        track("generation_completed");
      }
      if (status === "error") {
        toast.error(error ?? "Generation failed");
        track("generation_failed");
      }
    }
    previousStatus.current = status;
  }, [status, error, queryClient]);
}

/** Terms acceptance: the legacy app auto-accepted with a toast on first visit. */
function useTermsAcceptance(accepted: boolean | undefined, onboarded: boolean | undefined) {
  const router = useRouter();
  const updateMe = useUpdateMe();
  const acknowledged = useRef(false);

  useEffect(() => {
    if (acknowledged.current || !onboarded || accepted !== false) return;
    acknowledged.current = true;
    updateMe.mutate({ tos_accepted: true });
    toast("By using FeedTLDR you agree to the Terms of Use", {
      action: { label: "Read", onClick: () => router.push("/terms") },
    });
  }, [accepted, onboarded, router, updateMe]);
}

export default function FeedPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useMe();
  const feed = useFeed();
  const status = useGenerationStatus();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  const generating =
    status.data?.status === "in_progress" && !status.data.end_time;

  // Powers the hover previews on summary source links; shares its cache
  // with the source-data disclosure below the card.
  const sourceData = useSourceData(Boolean(feed.data && !feed.data.is_demo));
  const posts = useMemo<SourcePost[]>(
    () =>
      (sourceData.data?.rows ?? []).flatMap((row) =>
        typeof row.url === "string" && typeof row.text === "string"
          ? [
              {
                url: row.url,
                text: row.text,
                userName:
                  typeof row.userName === "string" ? row.userName : undefined,
                createdAt:
                  typeof row.createdAt === "string" ? row.createdAt : undefined,
              },
            ]
          : []
      ),
    [sourceData.data]
  );

  useGenerationCompletion(status.data?.status, status.data?.error);
  useTermsAcceptance(me.data?.tos_accepted, me.data?.onboarded);

  // Onboarding is mandatory before the feed (legacy requires_onboarding).
  useEffect(() => {
    if (me.data && !me.data.onboarded) router.replace("/onboarding");
  }, [me.data, router]);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppBar
        email={me.data?.email ?? ""}
        name={me.data?.name}
        plan={me.data?.plan}
        onOpenSettings={() => setSettingsOpen(true)}
        onRegenerate={() => setGenerateOpen(true)}
        regenerateDisabled={generating}
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-8 pb-24 sm:px-6 sm:pt-12">
        {feed.isLoading || me.isLoading ? (
          <FeedSkeleton />
        ) : feed.isError ? (
          <EmptyState
            title="Could not load your feed"
            description="Something went wrong talking to the server. Try again in a moment."
            action={
              <Button onClick={() => feed.refetch()} variant="outline">
                Try again
              </Button>
            }
          />
        ) : feed.data ? (
          <div className="flex flex-col gap-6">
            {feed.data.is_demo && !generating && (
              <Notice
                tone="info"
                filled
                title="This is a demo summary from real X accounts."
              >
                <p>
                  Generate your first feed summary with the Re-generate button,
                  or add your accounts in settings first.
                </p>
              </Notice>
            )}

            {generating ? (
              <Card className="border-none p-6 sm:p-8">
                <GenerationProgress
                  currentStage={status.data?.current_stage ?? "starting"}
                  stagesCompleted={status.data?.stages_completed ?? []}
                  error={
                    status.data?.status === "error"
                      ? status.data.error
                      : undefined
                  }
                />
              </Card>
            ) : (
              <>
                <Card className="gap-8 border-none p-6 sm:p-10 lg:p-12">
                  <PageHeader
                    title={feed.data.is_demo ? "Demo Feed" : "Today's Feed"}
                    description={
                      feed.data.last_generation_time_local
                        ? `Generated on ${feed.data.last_generation_time_local}`
                        : undefined
                    }
                  >
                    {feed.data.audio_url && (
                      <AudioPill src={feed.data.audio_url} className="pt-1" />
                    )}
                  </PageHeader>
                  <PostHoverPreviews posts={posts}>
                    <SummaryProse html={feed.data.summary_html} />
                  </PostHoverPreviews>
                </Card>
                {!feed.data.is_demo && <SourceDataDisclosure />}
              </>
            )}
          </div>
        ) : null}
      </main>

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onRegenerate={() => setGenerateOpen(true)}
      />
      <GenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        hasPreviousData={Boolean(
          feed.data && !feed.data.is_demo && feed.data.last_generation_time
        )}
        onStarted={() => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.generationStatus,
          });
          toast("Generation started", {
            description:
              "You can close the page; we'll email you when it's done.",
          });
        }}
      />
    </div>
  );
}
