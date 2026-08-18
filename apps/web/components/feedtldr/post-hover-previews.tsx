"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";

/**
 * Hover previews for summary source links: hovering (or focusing) a link
 * pill shows the original post verbatim in a floating card, so visiting X
 * is only needed when the reader wants the full context. Clicks pass
 * through to the link unchanged; touch devices skip straight to X.
 */

export type SourcePost = {
  url: string;
  text: string;
  userName?: string;
  createdAt?: string;
};

type Preview = {
  post: SourcePost;
  x: number;
  y: number;
  /** Card renders below the anchor when true, above it otherwise. */
  below: boolean;
};

const SHOW_DELAY_MS = 150;
const HIDE_DELAY_MS = 150;
/** Matches w-96 (24rem); used only to clamp against the viewport edge. */
const CARD_WIDTH_PX = 384;
/** Worst-case card height; decides whether the card flips above. */
const CARD_MAX_HEIGHT_PX = 400;
const ANCHOR_GAP_PX = 8;

/** Posts and links are matched on the numeric status id when present. */
function postKey(url: string): string {
  return url.match(/status(?:es)?\/(\d+)/)?.[1] ?? url;
}

export function PostHoverPreviews({
  posts,
  children,
}: {
  posts: SourcePost[];
  children: React.ReactNode;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const showTimer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);

  const postsByKey = useMemo(
    () => new Map(posts.map((post) => [postKey(post.url), post])),
    [posts]
  );

  useEffect(
    () => () => {
      window.clearTimeout(showTimer.current);
      window.clearTimeout(hideTimer.current);
    },
    []
  );

  // The card is viewport-anchored, so page scrolling would detach it
  // from its link; dismiss instead. Scrolling the card's own text does
  // not reach the window and keeps it open.
  useEffect(() => {
    if (!preview) return;
    const dismiss = () => setPreview(null);
    window.addEventListener("scroll", dismiss);
    return () => window.removeEventListener("scroll", dismiss);
  }, [preview]);

  function previewFor(anchor: HTMLAnchorElement): Preview | null {
    const post = postsByKey.get(postKey(anchor.href));
    if (!post) return null;
    const rect = anchor.getBoundingClientRect();
    const below =
      rect.bottom + ANCHOR_GAP_PX + CARD_MAX_HEIGHT_PX < window.innerHeight;
    return {
      post,
      x: Math.max(
        ANCHOR_GAP_PX,
        Math.min(rect.left, window.innerWidth - CARD_WIDTH_PX - ANCHOR_GAP_PX)
      ),
      y: below ? rect.bottom + ANCHOR_GAP_PX : rect.top - ANCHOR_GAP_PX,
      below,
    };
  }

  function scheduleShow(anchor: HTMLAnchorElement) {
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(showTimer.current);
    showTimer.current = window.setTimeout(() => {
      setPreview(previewFor(anchor));
    }, SHOW_DELAY_MS);
  }

  function scheduleHide() {
    window.clearTimeout(showTimer.current);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setPreview(null), HIDE_DELAY_MS);
  }

  function anchorFrom(target: EventTarget | null): HTMLAnchorElement | null {
    return target instanceof Element ? target.closest("a[href]") : null;
  }

  function handleOver(event: React.MouseEvent | React.FocusEvent) {
    const anchor = anchorFrom(event.target);
    if (anchor) scheduleShow(anchor);
  }

  function handleOut(event: React.MouseEvent | React.FocusEvent) {
    if (anchorFrom(event.target)) scheduleHide();
  }

  return (
    <div
      onMouseOver={handleOver}
      onMouseOut={handleOut}
      onFocus={handleOver}
      onBlur={handleOut}
    >
      {children}
      {preview && (
        <div
          role="tooltip"
          onMouseEnter={() => window.clearTimeout(hideTimer.current)}
          onMouseLeave={scheduleHide}
          style={{
            top: `${preview.y}px`,
            left: `${preview.x}px`,
            transform: preview.below ? undefined : `translateY(-100%)`,
          }}
          className="fixed z-50 flex w-96 flex-col gap-2 rounded-field border bg-popover p-5 shadow-overlay"
        >
          {(preview.post.userName || preview.post.createdAt) && (
            <p className="text-xs text-muted-foreground">
              {preview.post.userName && <>@{preview.post.userName}</>}
              {preview.post.userName && preview.post.createdAt && " · "}
              {preview.post.createdAt}
            </p>
          )}
          <p className="max-h-72 overflow-y-auto text-sm whitespace-pre-wrap">
            {preview.post.text}
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowUpRight className="size-3.5" /> Click the link to open on X
          </p>
        </div>
      )}
    </div>
  );
}
