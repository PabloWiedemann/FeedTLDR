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
import { SettingsSheet } from "@/components/feedtldr/settings-sheet";
import { SourceDataView } from "@/components/feedtldr/source-data";
import { SummaryProse } from "@/components/feedtldr/summary-prose";
import { useFeed, useGenerationStatus, useMe, useUpdateMe } from "@/lib/hooks";

export default function FeedPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  const feed = useFeed();
  const updateMe = useUpdateMe();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [tab, setTab] = useState("summary");
  const status = useGenerationStatus();
  const prevStatus = useRef<string | undefined>(undefined);

  const generating =
    status.data?.status === "in_progress" && !status.data.end_time;

  // Redirect to onboarding until completed (legacy requires_onboarding)
  useEffect(() => {
    if (me.data && !me.data.onboarded) {
      router.replace("/onboarding");
    }
  }, [me.data, router]);

  // TOS acceptance: legacy app auto-accepted with a toast on first visit
  useEffect(() => {
    if (me.data && me.data.onboarded && !me.data.tos_accepted) {
      updateMe.mutate({ tos_accepted: true });
      toast("By using FeedTLDR you agree to the Terms of Use", {
        action: { label: "Read", onClick: () => router.push("/terms") },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data?.tos_accepted, me.data?.onboarded]);

  // On the in_progress -> done transition: refresh data and notify
  useEffect(() => {
    const current = status.data?.status;
    if (prevStatus.current === "in_progress" && current && current !== "in_progress") {
      void qc.invalidateQueries({ queryKey: ["feed"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["source-data"] });
      if (current === "success") {
        toast.success("Your new summary is ready");
      } else if (current === "error") {
        toast.error(status.data?.error ?? "Generation failed");
      }
    }
    prevStatus.current = current;
  }, [status.data?.status, status.data?.error, qc]);

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
              <div className="flex flex-col gap-2 rounded-3xl bg-pastel-blue px-5 py-4 text-sm text-pastel-blue-foreground">
                <p className="font-medium">
                  This is a demo summary from real X accounts.
                </p>
                <p>
                  Generate your first feed summary with the Re-generate button,
                  or add your accounts in settings first.
                </p>
              </div>
            )}

            <header className="flex flex-col gap-3">
              <h1 className="text-4xl font-semibold sm:text-5xl">
                {feed.data.is_demo ? "Demo Feed" : "Today's Feed"}
              </h1>
              {feed.data.last_generation_time_local && (
                <p className="text-muted-foreground">
                  Generated on {feed.data.last_generation_time_local}
                </p>
              )}
              {!generating && feed.data.audio_url && (
                <AudioPill src={feed.data.audio_url} className="pt-1" />
              )}
            </header>

            {generating ? (
              <div className="rounded-3xl border bg-card p-6">
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
              <Tabs value={tab} onValueChange={setTab}>
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
                  <SourceDataView enabled={tab === "data" && !feed.data.is_demo} />
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
          void qc.invalidateQueries({ queryKey: ["generation-status"] });
          toast("Generation started", {
            description:
              "You can close the page; we'll email you when it's done.",
          });
        }}
      />
    </div>
  );
}
