import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

/**
 * The privacy policy is a generated legal document ported verbatim from the
 * legacy app (public/legal/privacy-policy.html) and rendered isolated in an
 * iframe so its embedded styles cannot clash with the design system.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-6 pb-24">
      <h1 className="mb-6 text-heading">Privacy Policy</h1>
      <iframe
        src="/legal/privacy-policy.html"
        title="FeedTLDR privacy policy"
        className="h-[70dvh] w-full rounded-card border bg-card"
      />
    </main>
  );
}
