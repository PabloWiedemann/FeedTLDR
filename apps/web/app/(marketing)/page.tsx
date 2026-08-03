import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SummaryProse } from "@/components/feedtldr/summary-prose";

const SAMPLE = `
<h3>Funding and Valuations</h3>
<p>Investment in generative AI startups topped $3.9B this quarter. One
research lab is fundraising at an $8B valuation, and a well-known founder is
raising for a new AI startup.</p>
<ul>
  <li><a href="#">x.com/status/example-1</a></li>
  <li><a href="#">x.com/status/example-2</a></li>
</ul>
<h3>Practical Applications</h3>
<p>Model-driven load balancing is making power grids greener, and a major
video tool announced in-editor AI generation.</p>
<ul>
  <li><a href="#">x.com/status/example-3</a></li>
</ul>`;

const STEPS = [
  {
    title: "Pick your voices",
    body: "Add the X accounts worth your attention: builders, news desks, researchers, friends.",
  },
  {
    title: "We read everything",
    body: "Every morning the last 24 hours of posts are collected and distilled into one clear summary.",
  },
  {
    title: "Read it, or hear it",
    body: "Skim it in the app, listen to the audio version, or get it delivered by email at 7am.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-28 px-6 pt-14 pb-28">
      {/* ---------------- hero (mock 1) ---------------- */}
      <section className="grid items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-10">
          <h1 className="text-display-xl">
            Stay Informed Without the Overwhelm
          </h1>
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-10">
            <Button asChild size="lg">
              <Link href="/signup">Try now</Link>
            </Button>
            <p
              className="max-w-sm text-lg leading-relaxed text-foreground/80 text-pretty"
            >
              Receive daily, curated summaries of your social media feeds so
              you&rsquo;re always up to date with the content that matters most.
            </p>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <Image
            src="/brand/landing_image_mascot.png"
            alt="The FeedTLDR mascot sipping a drink with social media icons as ice cubes"
            width={520}
            height={520}
            priority
            className="h-auto w-full max-w-md"
          />
        </div>
      </section>

      {/* ---------------- how it works ---------------- */}
      <section className="grid gap-10 lg:grid-cols-[2fr_3fr]">
        <h2 className="text-heading">
          Your feed, distilled every morning
        </h2>
        <ol className="flex flex-col">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex gap-6 border-t py-7 first:border-t-0 first:pt-0 last:pb-0"
            >
              <span className="font-mono text-sm text-muted-foreground tabular-nums pt-1">
                {i + 1}
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-section">{step.title}</h3>
                <p
                  className="max-w-md text-muted-foreground text-pretty"
                >
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- sample ---------------- */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-heading">
            What a summary looks like
          </h2>
          <p className="max-w-lg text-muted-foreground text-pretty">
            Headlines, the substance underneath, and links back to the original
            posts when you want to go deeper.
          </p>
        </div>
        <Card className="max-w-3xl">
          <CardContent>
            <SummaryProse html={SAMPLE} />
          </CardContent>
        </Card>
      </section>

      {/* ---------------- closing CTA ---------------- */}
      <section className="flex flex-col items-start gap-6 border-t pt-16">
        <h2 className="max-w-2xl text-heading">
          Five minutes a day is enough to stay in the loop
        </h2>
        <Button asChild size="lg">
          <Link href="/signup">Try now</Link>
        </Button>
      </section>
    </main>
  );
}
