import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ABOUT_PARAGRAPHS } from "@/lib/legal";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  // Hidden until the copy is rewritten (footer link removed alongside);
  // delete the notFound() to bring the page back.
  notFound();
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-6 pb-24">
      <h1 className="mb-8 text-display-lg">About us</h1>
      <div className="flex max-w-prose flex-col gap-5 text-lg leading-relaxed">
        {ABOUT_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} className="text-pretty">
            {paragraph}
          </p>
        ))}
      </div>
    </main>
  );
}
