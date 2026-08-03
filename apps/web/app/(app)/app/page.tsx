"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChatCircleDots } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppBar } from "@/components/feedtldr/app-bar";
import { AudioPill } from "@/components/feedtldr/audio-pill";
import { EmptyState } from "@/components/feedtldr/empty-state";
import { GenerateDialog } from "@/components/feedtldr/generate-dialog";
import { GenerationProgress } from "@/components/feedtldr/generation-progress";
import { Notice } from "@/components/feedtldr/notice";
import { PageHeader } from "@/components/feedtldr/page-header";
import { SettingsSheet } from "@/components/feedtldr/settings-sheet";
import { SourceDataView } from "@/components/feedtldr/source-data";
import { SummaryProse } from "@/components/feedtldr/summary-prose";
import { useFeed, useGenerationStatus, useMe } from "@/lib/api/queries";
import { useUpdateMe } from "@/lib/api/mutations";
import { generationResultKeys, queryKeys } from "@/lib/api/query-keys";

type FeedTab = "summary" | "data";

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-6">
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
      if (status === "success") toast.success("Your new summary is ready");
      if (status === "error") toast.error(error ?? "Generation failed");
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
  const [tab, setTab] = useState<FeedTab>("summary");

  const generating =
    status.data?.status === "in_progress" && !status.data.end_time;

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
        onOpenSettings={() => setSettingsOpen(true)}
        onRegenerate={() => setGenerateOpen(true)}
        regenerateDisabled={generating}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-10 pb-24">
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

            <PageHeader
              title={feed.data.is_demo ? "Demo Feed" : "Today's Feed"}
              description={
                feed.data.last_generation_time_local
                  ? `Generated on ${feed.data.last_generation_time_local}`
                  : undefined
              }
            >
              {!generating && feed.data.audio_url && (
                <AudioPill src={feed.data.audio_url} className="pt-1" />
              )}
            </PageHeader>

            {generating ? (
              <div className="rounded-card border bg-card p-6">
                <GenerationProgress
                  currentStage={status.data?.current_stage ?? "starting"}
                  stagesCompleted={status.data?.stages_completed ?? []}
                  error={
                    status.data?.status === "error"
                      ? status.data.error
                      : undefined
                  }
                />
              </div>
            ) : (
              <Tabs
                value={tab}
                onValueChange={(value) => setTab(value as FeedTab)}
              >
                <TabsList>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="data" disabled={feed.data.is_demo}>
                    Source data
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="pt-6">
                  <div className="border-t pt-8">
                    <SummaryProse html={feed.data.summary_html} />
                  </div>
                </TabsContent>
                <TabsContent value="data" className="pt-6">
                  <SourceDataView
                    enabled={tab === "data" && !feed.data.is_demo}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        ) : null}
      </main>

      {!generating && (
        <div className="pointer-events-none sticky bottom-6 mx-auto w-full max-w-3xl px-6">
          <div className="flex justify-end">
            <Button
              asChild
              variant="outline"
              className="pointer-events-auto bg-card"
            >
              <Link href="/app/chat">
                <ChatCircleDots /> AI chat
              </Link>
            </Button>
          </div>
        </div>
      )}

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
