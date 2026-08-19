/**
 * Landing copy, shared by every layout variant. Written to simple-english
 * rules: short sentences, active voice, one idea per sentence.
 */

export const LANDING_COPY = {
  headline: "Your feed, summarized every morning",
  subhead:
    "FeedTLDR reads the accounts you pick and writes one short summary each day. Read it, listen to it, or get it in your inbox.",
  cta: "Get your first summary",
  ctaNote: "Free to start. No card needed.",
  steps: [
    {
      title: "Pick accounts",
      body: "Choose the X accounts that matter to you.",
    },
    {
      title: "We do the reading",
      body: "Each morning we turn the last 24 hours of posts into one short summary.",
    },
    {
      title: "Read it or hear it",
      body: "Open it in the app, play the audio, or read it in your email at 7am.",
    },
  ],
  closing: {
    headline: "Stay in the loop in five minutes a day",
    cta: "Get your first summary",
  },
} as const;

/** Sample summary shown in the hero product card. */
export const SAMPLE_BRIEF = {
  title: "Your morning summary",
  date: "Monday, August 18",
  meta: "142 posts from 12 accounts",
  audioDuration: "2:47",
  html: `
<h3>Model releases</h3>
<p>Two labs shipped new reasoning models overnight. Early benchmarks put the
smaller one ahead on code tasks, at a third of the price.</p>
<ul>
  <li><a href="#">x.com/status/example-1</a></li>
  <li><a href="#">x.com/status/example-2</a></li>
</ul>
<h3>Worth your time</h3>
<p>A widely shared thread argues that bigger context windows do not replace
retrieval. The cost math still favors small, focused prompts.</p>
<ul>
  <li><a href="#">x.com/status/example-3</a></li>
</ul>`,
} as const;
