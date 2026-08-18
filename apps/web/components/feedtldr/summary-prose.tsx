import { normalizeSummaryHtml } from "@/lib/summary-html";

/**
 * Renders the pipeline's summary_html. The API sanitizes it server-side (nh3
 * allowlist); this component normalizes spacing artifacts and applies the
 * prose styling from globals.css.
 */
export function SummaryProse({ html }: { html: string }) {
  return (
    <div
      className="summary-prose"
      dangerouslySetInnerHTML={{ __html: normalizeSummaryHtml(html) }}
    />
  );
}
