import type { Metadata } from "next";
import { ABOUT_PARAGRAPHS } from "@/lib/legal";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-6 pb-24">
      <h1 className="mb-8 text-4xl font-semibold">About us</h1>
      <div className="flex max-w-[65ch] flex-col gap-5 text-lg leading-relaxed">
        {ABOUT_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} style={{ textWrap: "pretty" }}>
            {paragraph}
          </p>
        ))}
      </div>
    </main>
  );
}
