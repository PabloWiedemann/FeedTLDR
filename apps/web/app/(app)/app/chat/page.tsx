"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUp, CircleNotch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat, useMe, type ChatMessage } from "@/lib/hooks";

const EXAMPLES = [
  "What are the main topics in my feed today?",
  "Which posts got the most engagement?",
  "Any breaking news or big announcements?",
];

/** Chat with your feed (legacy pages/chat.py), one credit-metered turn at a time. */
export default function ChatPage() {
  const me = useMe();
  const chat = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  function send(text: string) {
    const content = text.trim();
    if (!content || chat.isPending) return;
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setDraft("");
    chat.mutate(next, {
      onSuccess: (data) => {
        setMessages([...next, data.message]);
        requestAnimationFrame(() => {
          listRef.current?.scrollTo({
            top: listRef.current.scrollHeight,
            behavior: "smooth",
          });
        });
      },
    });
  }

  const creditsLeft = me.data
    ? me.data.credits.monthly_left + me.data.credits.prepaid_left
    : null;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-6">
      <header className="flex items-center justify-between gap-4 py-5">
        <Button asChild variant="ghost" size="sm">
          <Link href="/app">
            <ArrowLeft /> Back to summary
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          {creditsLeft !== null && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {creditsLeft} credits left
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={messages.length === 0}
            onClick={() => setMessages([])}
          >
            Clear chat
          </Button>
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto pb-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div>
              <h1 className="text-2xl font-semibold">Chat with your feed</h1>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Ask about what&rsquo;s happening in your network. The AI has
                your latest posts and summary as context.
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => send(example)}
                    className="rounded-full border px-4 py-2 text-sm transition-colors duration-150 outline-none hover:bg-card focus-visible:ring-[3px] focus-visible:ring-ring/45 active:scale-[0.96]"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {messages.map((message, i) => (
              <li
                key={i}
                className={
                  message.role === "user"
                    ? "ms-auto max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                    : "me-auto max-w-[85%] rounded-3xl rounded-bl-lg border bg-card px-4 py-2.5 text-sm whitespace-pre-wrap"
                }
              >
                {message.content}
              </li>
            ))}
            {chat.isPending && (
              <li className="me-auto flex items-center gap-2 rounded-3xl border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                <CircleNotch className="size-4 animate-spin" /> Thinking…
              </li>
            )}
          </ul>
        )}
      </div>

      <form
        className="flex items-center gap-2 pb-6"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about your feed…"
          aria-label="Chat message"
          className="bg-card"
        />
        <Button
          type="submit"
          size="icon"
          disabled={chat.isPending || draft.trim() === ""}
          aria-label="Send message"
        >
          <ArrowUp />
        </Button>
      </form>
    </div>
  );
}
