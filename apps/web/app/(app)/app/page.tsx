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
import { ChatPanel } from "@/components/feedtldr/chat-panel";
import { EmptyState } from "@/components/feedtldr/empty-state";
import { GenerateDialog } from "@/components/feedtldr/generate-dialog";
import { GenerationProgress } from "@/components/feedtldr/generation-progress";
import { Notice } from "@/components/feedtldr/notice";
import { PageHeader } from "@/components/feedtldr/page-header";
import {
  PostHoverPreviews,
  type SourcePost,
} from "@/components/feedtldr/post-hover-previews";
import { SourceDataView } from "@/components/feedtldr/source-data";
import { SummaryProse } from "@/components/feedtldr/summary-prose";
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
 * explains how the summary was made, so it stays folded until asked for.
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
            The posts and accounts behind this summary.
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

/** Chat panel width bounds (px); the user drags the card's left edge. */
const CHAT_WIDTH = { min: 380, max: 600, default: 448 } as const;

function clampChatWidth(width: number) {
  return Math.min(CHAT_WIDTH.max, Math.max(CHAT_WIDTH.min, width));
}

export default function FeedPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useMe();
  const feed = useFeed();
  const status = useGenerationStatus();

  const [generateOpen, setGenerateOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState<number>(CHAT_WIDTH.default);
  const [chatResizing, setChatResizing] = useState(false);

  function startChatResize(event: React.PointerEvent) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = chatWidth;
    setChatResizing(true);
    const onMove = (move: PointerEvent) =>
      setChatWidth(clampChatWidth(startWidth + startX - move.clientX));
    const onUp = () => {
      setChatResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleChatResizeKey(event: React.KeyboardEvent) {
    const step =
      event.key === "ArrowLeft" ? 24 : event.key === "ArrowRight" ? -24 : 0;
    if (step === 0) return;
    event.preventDefault();
    setChatWidth((width) => clampChatWidth(width + step));
  }

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
    <div className="flex min-h-dvh overflow-x-clip">
      {/* The whole app column (bar included) narrows when the chat opens. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppBar
          email={me.data?.email ?? ""}
          name={me.data?.name}
          plan={me.data?.plan}
          onRegenerate={() => setGenerateOpen(true)}
          onToggleChat={() => setChatOpen((value) => !value)}
          chatOpen={chatOpen}
          regenerateDisabled={generating}
        />

        <main className="mx-auto w-full max-w-4xl min-w-0 flex-1 px-4 pt-8 pb-24 sm:px-6 sm:pt-12">
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
      </div>

      {/* Kept mounted while closed so the conversation survives reopening.
          Desktop: the panel spans the full viewport height beside the app
          column (the app bar narrows with the content); the wrapper animates
          its width so everything eases over while the floating card slides
          in from the right edge (the root's overflow-x-clip swallows it
          while closed). The width is user-resizable via the drag handle on
          the card's left edge. Mobile: a full-screen overlay that fades up. */}
      <div
          style={{ "--chat-width": `${chatWidth}px` } as React.CSSProperties}
          className={cn(
            "max-lg:contents lg:block lg:shrink-0",
            !chatResizing && "lg:transition-[width] lg:duration-300 lg:ease-brand",
            chatOpen ? "lg:w-[var(--chat-width)]" : "lg:w-0"
          )}
        >
          <aside
            className={cn(
              "fixed inset-0 z-50 flex h-dvh flex-col bg-card transition-[opacity,translate,visibility] duration-300 ease-brand",
              "lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-[var(--chat-width)] lg:bg-transparent lg:p-2",
              chatResizing && "lg:transition-none lg:select-none",
              chatOpen
                ? "translate-y-0 opacity-100 lg:translate-x-0"
                : "invisible translate-y-6 opacity-0 lg:translate-y-0 lg:translate-x-10"
            )}
            aria-label="AI chat"
            aria-hidden={!chatOpen}
            inert={!chatOpen}
          >
            <div className="relative flex h-full min-h-0 flex-col lg:overflow-hidden lg:rounded-card lg:border lg:bg-card">
              <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
            </div>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize chat panel"
              aria-valuemin={CHAT_WIDTH.min}
              aria-valuemax={CHAT_WIDTH.max}
              aria-valuenow={chatWidth}
              tabIndex={0}
              onPointerDown={startChatResize}
              onDoubleClick={() => setChatWidth(CHAT_WIDTH.default)}
              onKeyDown={handleChatResizeKey}
              className="focus-ring absolute inset-y-2 left-0 hidden w-2 cursor-col-resize touch-none rounded-full before:absolute before:inset-y-0 before:left-1/2 before:w-1 before:-translate-x-1/2 before:rounded-full before:bg-border before:opacity-0 before:transition-opacity before:duration-150 before:ease-brand before:content-[''] hover:before:opacity-100 focus-visible:before:opacity-100 active:before:bg-foreground/25 active:before:opacity-100 lg:block"
            />
          </aside>
      </div>

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
