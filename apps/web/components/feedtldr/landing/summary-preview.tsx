import { SpeakerHigh } from "@phosphor-icons/react/dist/ssr";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SummaryProse } from "@/components/feedtldr/summary-prose";
import { cn } from "@/lib/utils";
import { SAMPLE_BRIEF } from "./copy";

/**
 * Hero product card: a dressed-up daily brief (title, date, audio,
 * summary prose) on a white card with a soft shadow and no border.
 */

/** Static stand-in for AudioPill: looks playable, plays nothing. */
function AudioPillPreview() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3">
      <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-foreground/25 px-4 text-sm font-medium">
        <SpeakerHigh className="size-4 text-link" />
        Play summary
      </span>
    </div>
  );
}

export function SummaryPreview({ className }: { className?: string }) {
  return (
    <Card
      className={cn(
        "gap-8 border-none py-8 text-left shadow-card transition-[translate,box-shadow] duration-300 ease-brand hover:-translate-y-1 hover:shadow-card-hover",
        className
      )}
    >
      <CardHeader className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-muted-foreground">
            {SAMPLE_BRIEF.date} · {SAMPLE_BRIEF.meta}
          </p>
          <h3 className="text-title">{SAMPLE_BRIEF.title}</h3>
        </div>
        <AudioPillPreview />
      </CardHeader>
      <CardContent>
        <SummaryProse html={SAMPLE_BRIEF.html} />
      </CardContent>
    </Card>
  );
}
