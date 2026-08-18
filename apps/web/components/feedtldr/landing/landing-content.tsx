import {
  ChatCircleDots,
  EnvelopeSimple,
  SpeakerHigh,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { LANDING_COPY, SAMPLE_BRIEF } from "./copy";
import { CtaLink } from "./cta-link";
import { SummaryPreview } from "./summary-preview";

/* bento hover: a soft settle upward with the shadow deepening in
   step — one interruptible transition, translate + box-shadow only */
const CARD_LIFT =
  "transition-[translate,box-shadow] duration-300 ease-brand hover:-translate-y-1 hover:shadow-card-hover";

/**
 * Landing page body: bento hero (the round-1 winner) plus a slim
 * steps strip and a closing CTA.
 */

function BentoTile({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card
      className={`h-full justify-center gap-3 border-none px-6 shadow-card ${CARD_LIFT}`}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-foreground">
        {icon}
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-section">{title}</h3>
        <p className="text-sm text-muted-foreground text-pretty">{body}</p>
      </div>
    </Card>
  );
}

const TILES = [
  {
    icon: <EnvelopeSimple className="size-6" />,
    title: "In your inbox at 7am",
    body: "Get the brief as an email, ready with your coffee.",
  },
  {
    icon: <ChatCircleDots className="size-6" />,
    title: "Chat with your feed",
    body: "Ask a question about any story. FeedTLDR answers from the posts in your feed.",
  },
  {
    icon: <SpeakerHigh className="size-6" />,
    title: "Listen on the go",
    body: `Every brief comes with audio. Today's is ${SAMPLE_BRIEF.audioDuration} long.`,
  },
];

function HeroBento() {
  return (
    <section className="flex flex-col items-center gap-12">
      <div className="flex flex-col items-center gap-5 text-center">
        <h1 className="max-w-4xl font-display text-display-xl">
          {LANDING_COPY.headline}
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-foreground/80 text-pretty">
          {LANDING_COPY.subhead}
        </p>
        <div className="mt-2 flex flex-col items-center gap-3">
          <CtaLink location="hero">{LANDING_COPY.cta}</CtaLink>
          <p className="text-sm text-muted-foreground">
            {LANDING_COPY.ctaNote}
          </p>
        </div>
      </div>
      <div className="grid w-full gap-4 lg:grid-cols-3">
        <SummaryPreview className="lg:col-span-2 lg:row-span-3" />
        {TILES.map((tile) => (
          <BentoTile
            key={tile.title}
            icon={tile.icon}
            title={tile.title}
            body={tile.body}
          />
        ))}
      </div>
    </section>
  );
}

function StepsStrip() {
  return (
    <section className="grid gap-10 border-t pt-14 sm:grid-cols-3">
      {LANDING_COPY.steps.map((step, i) => (
        <div key={step.title} className="flex flex-col gap-2">
          <span className="font-mono text-sm text-muted-foreground tabular-nums">
            {i + 1}
          </span>
          <h2 className="text-section">{step.title}</h2>
          <p className="text-muted-foreground text-pretty">{step.body}</p>
        </div>
      ))}
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="flex flex-col items-center gap-6 border-t pt-14 text-center">
      <h2 className="max-w-2xl font-display text-heading">
        {LANDING_COPY.closing.headline}
      </h2>
      <CtaLink location="closing">{LANDING_COPY.closing.cta}</CtaLink>
    </section>
  );
}

export function LandingContent() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-6 pt-12 pb-24">
      <HeroBento />
      <StepsStrip />
      <ClosingCta />
    </main>
  );
}
