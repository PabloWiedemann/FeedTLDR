"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUp } from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/feedtldr/spinner";
import { useMe } from "@/lib/api/queries";
import { useChat } from "@/lib/api/mutations";
import { creditsLeft } from "@/lib/credits";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/api/types";

const EXAMPLE_QUESTIONS = [
  "What are the main topics in my feed today?",
  "Which posts got the most engagement?",
  "Any breaking news or big announcements?",
];

function ChatBubble({ message }: { message: ChatMessage }) {
  const fromUser = message.role === "user";
  return (
    <li
      className={cn(
        "max-w-[85%] rounded-card px-4 text-sm",
        fromUser
          ? "ms-auto rounded-br-lg bg-primary py-2.5 text-primary-foreground"
          : "me-auto rounded-bl-lg border bg-card py-3"
      )}
    >
      {fromUser ? (
        message.content
      ) : (
        <div className="chat-prose">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      )}
    </li>
  );
}

function ChatIntro({ onAsk }: { onAsk: (question: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
      <div>
        <h1 className="text-title">Chat with your feed</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
          Ask about what&rsquo;s happening in your network. The AI has your
          latest posts and summary as context.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {EXAMPLE_QUESTIONS.map((question) => (
          <li key={question}>
            <Button variant="outline" onClick={() => onAsk(question)}>
              {question}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Chat with your feed (legacy pages/chat.py), one credit-metered turn at a time. */
export default function ChatPage() {
  const me = useMe();
  const chat = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

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
    if (!content || chat.isPending) return;

    const withQuestion: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(withQuestion);
    setDraft("");
    chat.mutate(withQuestion, {
      onSuccess: (data) => {
        setMessages([...withQuestion, data.message]);
        scrollToLatest();
      },
    });
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-6">
      <header className="flex items-center justify-between gap-4 py-5">
        <Button asChild variant="ghost" size="sm">
          <Link href="/app">
            <ArrowLeft /> Back to summary
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          {me.data && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {creditsLeft(me.data.credits)} credits left
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
          <ChatIntro onAsk={send} />
        ) : (
          <ul className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <ChatBubble key={index} message={message} />
            ))}
            {chat.isPending && (
              <li className="me-auto flex items-center gap-2 rounded-card border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                <Spinner className="size-4" /> Thinking…
              </li>
            )}
          </ul>
        )}
      </div>

      <form
        className="flex items-center gap-2 pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
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
