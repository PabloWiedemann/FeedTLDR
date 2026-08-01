import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { TERMS_OF_USE } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-6 pb-24">
      <article className="summary-prose [&_h1]:text-3xl [&_h1]:border-t-0 [&_h1]:pt-0">
        <ReactMarkdown>{TERMS_OF_USE}</ReactMarkdown>
      </article>
    </main>
  );
}
