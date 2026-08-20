"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/**
 * Click previews for summary source links: clicking a link with a matching
 * scraped post never navigates — a light popup card appears beside the link
 * with the full post and one clear CTA that opens X in a new tab. No scrim,
 * so the reading flow stays intact; outside click, Escape, or page scroll
 * dismisses it. Links without a matching post keep their default behavior.
 */

export type SourcePost = {
  url: string;
  text: string;
  userName?: string;
  createdAt?: string;
};

type Popup = {
  post: SourcePost;
  x: number;
  y: number;
  /** Card renders below the anchor when true, above it otherwise. */
  below: boolean;
};

/** Matches w-96 (24rem); used only to clamp against the viewport edge. */
const CARD_WIDTH_PX = 384;
/** Worst-case card height; decides whether the card flips above. */
const CARD_MAX_HEIGHT_PX = 420;
const ANCHOR_GAP_PX = 8;

/** Posts and links are matched on the numeric status id when present. */
function postKey(url: string): string {
  return url.match(/status(?:es)?\/(\d+)/)?.[1] ?? url;
}

export function PostPreviews({
  posts,
  children,
}: {
  posts: SourcePost[];
  children: React.ReactNode;
}) {
  const [popup, setPopup] = useState<Popup | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const postsByKey = useMemo(
    () => new Map(posts.map((post) => [postKey(post.url), post])),
    [posts]
  );

  // The card is viewport-anchored, so page scrolling would detach it from
  // its link; dismiss instead. Escape and clicks outside the card dismiss
  // too (a click on another source link reopens there right after).
  useEffect(() => {
    if (!popup) return;
    const dismiss = () => setPopup(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopup(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !cardRef.current?.contains(event.target)
      ) {
        setPopup(null);
      }
    };
    window.addEventListener("scroll", dismiss);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("scroll", dismiss);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [popup]);

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    const anchor =
      target instanceof Element
        ? target.closest<HTMLAnchorElement>("a[href]")
        : null;
    if (!anchor || !event.currentTarget.contains(anchor)) return;
    // Links inside the popup itself (the CTA) navigate normally.
    if (cardRef.current?.contains(anchor)) return;
    const post = postsByKey.get(postKey(anchor.href));
    if (!post) return;
    event.preventDefault();
    const rect = anchor.getBoundingClientRect();
    const below =
      rect.bottom + ANCHOR_GAP_PX + CARD_MAX_HEIGHT_PX < window.innerHeight;
    setPopup({
      post,
      x: Math.max(
        ANCHOR_GAP_PX,
        Math.min(rect.left, window.innerWidth - CARD_WIDTH_PX - ANCHOR_GAP_PX)
      ),
      y: below ? rect.bottom + ANCHOR_GAP_PX : rect.top - ANCHOR_GAP_PX,
      below,
    });
  }

  return (
    <div onClick={handleClick}>
      {children}
      {popup && (
        <div
          ref={cardRef}
          role="dialog"
          aria-label={
            popup.post.userName
              ? `Post by @${popup.post.userName}`
              : "Original post"
          }
          style={{
            top: `${popup.y}px`,
            left: `${popup.x}px`,
            transform: popup.below ? undefined : `translateY(-100%)`,
          }}
          className="fixed z-50 flex w-96 max-w-[calc(100vw-1rem)] flex-col gap-3 rounded-field border bg-popover p-5 shadow-overlay animate-in fade-in zoom-in-95 duration-150 ease-brand"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <p className="font-semibold">
                {popup.post.userName
                  ? `@${popup.post.userName}`
                  : "Original post"}
              </p>
              {popup.post.createdAt && (
                <p className="text-xs text-muted-foreground">
                  {popup.post.createdAt}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPopup(null)}
              aria-label="Close preview"
            >
              <X />
            </Button>
          </div>
          <p className="max-h-72 overflow-y-auto text-sm whitespace-pre-wrap">
            {popup.post.text}
          </p>
          <Button asChild className="self-end">
            <a href={popup.post.url} target="_blank" rel="noopener noreferrer">
              Open the post on X <ArrowUpRight />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
