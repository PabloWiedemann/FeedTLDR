"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Article,
  ArrowUp,
  ChatCircleDots,
  Newspaper,
  Plus,
  TrendUp,
  X,
  XLogo,
} from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Notice } from "./notice";
import { Spinner } from "./spinner";
import { useFeed, useMe } from "@/lib/api/queries";
import { useChat } from "@/lib/api/mutations";
import { creditsLeft } from "@/lib/credits";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/api/types";

/**
 * Starter questions, rendered as a loose stack of tilted cards. Each tilt is
 * the card's resting pose; hover/focus straightens and lifts it, and a click
 * drops the question into the composer.
 */
const SUGGESTIONS = [
  {
    question: "What are the main topics today?",
    icon: <ChatCircleDots className="size-4" />,
    tilt: "-rotate-2",
  },
  {
    question: "Which posts got the most attention?",
    icon: <TrendUp className="size-4" />,
    tilt: "rotate-2 -mt-1.5 ml-10",
  },
  {
    question: "What is the biggest news?",
    icon: <Newspaper className="size-4" />,
    tilt: "-rotate-1 -mt-1.5 -ml-12",
  },
];
const CHAT_MESSAGE_COST = 3;

/**
 * Staggered reveal for panel content while the side panel opens (DESIGN.md
 * §6): each block fades up once the panel reports itself open. Blocks add a
 * `delay-*` step of 80ms.
 */
const PANEL_REVEAL =
  "translate-y-3 opacity-0 transition-[opacity,translate,rotate] duration-300 ease-brand group-data-[state=open]/panel:translate-y-0 group-data-[state=open]/panel:opacity-100";

/** A context source the chat request can include; rendered as a composer card. */
export type ChatContextCard = {
  id: "posts" | "summary";
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  active: boolean;
};

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <li className="ms-auto max-w-[85%] animate-in fade-in slide-in-from-bottom-2 rounded-card rounded-br-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        {message.content}
      </li>
    );
  }
  // Assistant replies read as prose on the canvas, not as a boxed bubble.
  return (
    <li className="animate-in fade-in slide-in-from-bottom-2 text-sm">
      <div className="chat-prose">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </li>
  );
}

/**
 * Dia-style context card: icon tile + two-line label on a soft wash, with a
 * remove button that appears on hover/focus. Touch users toggle the same
 * sources from the composer's plus menu.
 */
function ContextChip({
  card,
  onRemove,
}: {
  card: ChatContextCard;
  onRemove: () => void;
}) {
  return (
    <li className="group/chip relative">
      <div className="flex items-center gap-2.5 rounded-xl bg-secondary py-2 pr-4 pl-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-card text-link shadow-lift">
          {card.icon}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-xs font-medium">{card.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {card.subtitle}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${card.title} from context`}
        className="focus-ring press absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border bg-card text-muted-foreground opacity-0 shadow-lift transition-[opacity,color] duration-150 ease-brand after:absolute after:-inset-2 after:content-[''] hover:text-foreground focus-visible:opacity-100 group-hover/chip:opacity-100"
      >
        <X className="size-3" />
      </button>
    </li>
  );
}

/**
 * Floating composer card: context chips above a borderless input with the
 * add-context menu and a round send button. The card border darkens while
 * the input holds focus (the input carries no ring of its own).
 */
export function ChatComposer({
  draft,
  onDraftChange,
  onSubmit,
  cards,
  onToggleCard,
  disabled = false,
  pending = false,
  inputRef,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  cards: ChatContextCard[];
  onToggleCard: (id: ChatContextCard["id"]) => void;
  disabled?: boolean;
  pending?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const active = cards.filter((card) => card.active);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="rounded-card border border-border/70 bg-card p-2 shadow-card transition-[border-color] duration-150 ease-brand has-[input:focus-visible]:border-foreground/40"
    >
      {active.length > 0 && (
        <ul className="flex flex-wrap gap-2 pb-2">
          {active.map((card) => (
            <ContextChip
              key={card.id}
              card={card}
              onRemove={() => onToggleCard(card.id)}
            />
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Ask about your feed…"
          aria-label="Chat message"
          disabled={disabled}
          className="h-10 w-full min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Choose chat context"
            >
              <Plus />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="min-w-48">
            <DropdownMenuLabel>Chat context</DropdownMenuLabel>
            {cards.map((card) => (
              <DropdownMenuCheckboxItem
                key={card.id}
                checked={card.active}
                onCheckedChange={() => onToggleCard(card.id)}
                onSelect={(event) => event.preventDefault()}
              >
                {card.title}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="submit"
          size="icon"
          aria-label="Send message"
          disabled={pending || disabled || draft.trim() === ""}
        >
          <ArrowUp />
        </Button>
      </div>
    </form>
  );
}

/**
 * Empty chat: a loose stack of tilted starter-question cards over short
 * copy. Picking a card fills the composer instead of sending, so the user
 * can edit before asking.
 */
export function ChatEmptyState({
  onPick,
  disabled,
}: {
  onPick: (question: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-4 py-8 text-center">
      <div className={cn(PANEL_REVEAL, "flex flex-col items-center")}>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.question}
            type="button"
            disabled={disabled}
            onClick={() => onPick(suggestion.question)}
            className={cn(
              "focus-ring press relative flex w-fit max-w-full items-start gap-2.5 rounded-card bg-card px-4 py-3 text-left shadow-card transition-[rotate,translate,scale,box-shadow] duration-200 ease-brand",
              "hover:z-10 hover:-translate-y-1 hover:rotate-0 hover:shadow-card-hover",
              "focus-visible:z-10 focus-visible:-translate-y-1 focus-visible:rotate-0",
              "disabled:pointer-events-none disabled:opacity-60",
              suggestion.tilt
            )}
          >
            <span className="mt-0.5 shrink-0 text-link">{suggestion.icon}</span>
            <span className="text-sm">{suggestion.question}</span>
          </button>
        ))}
      </div>
      <div className={cn(PANEL_REVEAL, "delay-80")}>
        <h3 className="font-semibold">Ask about your feed</h3>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          The AI reads your latest posts and your summary.
        </p>
      </div>
    </div>
  );
}

/**
 * Chat with your feed, one credit-metered turn at a time. Lives in the
 * persistent side panel on /app; the parent keeps this component mounted
 * while the panel is closed so the conversation survives reopening. `open`
 * drives the staggered content reveal and moves focus into the input.
 */
export function ChatPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const me = useMe();
  const feed = useFeed();
  const chat = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [context, setContext] = useState({ posts: true, summary: true });
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const balance = me.data ? creditsLeft(me.data.credits) : null;
  const outOfCredits = balance !== null && balance < CHAT_MESSAGE_COST;

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  const cards: ChatContextCard[] = [
    {
      id: "posts",
      title: "Feed posts",
      subtitle: feed.data?.is_demo ? "Demo data" : "Latest scrape",
      icon: <XLogo className="size-4" />,
      active: context.posts,
    },
    {
      id: "summary",
      title: "Summary",
      subtitle: "Latest summary",
      icon: <Article className="size-4" />,
      active: context.summary,
    },
  ];

  function scrollToLatest() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  function send(text: string) {
    const content = text.trim();
    if (!content || chat.isPending || outOfCredits) return;

    const withQuestion: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(withQuestion);
    setDraft("");
    scrollToLatest();
    chat.mutate(
      {
        messages: withQuestion,
        context: {
          include_posts: context.posts,
          include_summary: context.summary,
        },
      },
      {
        onSuccess: (data) => {
          setMessages([...withQuestion, data.message]);
          scrollToLatest();
        },
      }
    );
  }

  return (
    <div
      data-state={open ? "open" : "closed"}
      className="group/panel flex h-full flex-col"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4 pb-2">
        <h2 className="text-sm font-semibold">AI chat</h2>
        <div className="flex items-center gap-1">
          {me.data && (
            <span className="pe-1 text-xs tabular-nums text-muted-foreground">
              {balance} credits
            </span>
          )}
          <Button
            variant="ghost"
            size="xs"
            disabled={messages.length === 0}
            onClick={() => setMessages([])}
          >
            Clear
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X />
          </Button>
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-3">
        {messages.length === 0 ? (
          <ChatEmptyState
            onPick={(question) => {
              setDraft(question);
              inputRef.current?.focus();
            }}
            disabled={outOfCredits}
          />
        ) : (
          <ul className={cn(PANEL_REVEAL, "flex flex-col gap-4 delay-80")}>
            {messages.map((message, index) => (
              <ChatBubble key={index} message={message} />
            ))}
            {chat.isPending && (
              <li className="flex animate-in fade-in items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" /> Thinking…
              </li>
            )}
          </ul>
        )}
      </div>

      <div className={cn(PANEL_REVEAL, "shrink-0 px-4 pb-4 delay-160")}>
        {outOfCredits && (
          <Notice role="status" tone="warning" filled className="mb-3">
            You have used the credits available for another chat message. Your
            existing summary and chat stay available.{" "}
            <Link
              href="/pricing"
              className="text-link underline underline-offset-2"
            >
              Compare Basic and Pro
            </Link>{" "}
            to continue.
          </Notice>
        )}
        <ChatComposer
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={() => send(draft)}
          cards={cards}
          onToggleCard={(id) =>
            setContext((value) => ({ ...value, [id]: !value[id] }))
          }
          disabled={outOfCredits}
          pending={chat.isPending}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}
