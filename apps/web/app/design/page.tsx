"use client";

import { useState } from "react";
import { Article, XLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AccountChip, SuggestionChip } from "@/components/feedtldr/account-chip";
import { AppBar } from "@/components/feedtldr/app-bar";
import {
  ChatComposer,
  ChatEmptyState,
  type ChatContextCard,
} from "@/components/feedtldr/chat-panel";
import { AudioPill } from "@/components/feedtldr/audio-pill";
import { CreditBadge } from "@/components/feedtldr/credit-badge";
import { DemoCallout } from "@/components/feedtldr/demo-callout";
import { EmptyState } from "@/components/feedtldr/empty-state";
import { GettingStarted } from "@/components/feedtldr/getting-started";
import { GenerationProgress } from "@/components/feedtldr/generation-progress";
import { Logo } from "@/components/feedtldr/logo";
import { Notice } from "@/components/feedtldr/notice";
import { OnboardingSteps } from "@/components/feedtldr/onboarding-steps";
import { SurveyQuestion } from "@/components/feedtldr/survey-question";
import { PageHeader } from "@/components/feedtldr/page-header";
import { PlanCard } from "@/components/feedtldr/plan-card";
import { SourceDataTable } from "@/components/feedtldr/source-data-table";
import { Spinner } from "@/components/feedtldr/spinner";
import { StatCard } from "@/components/feedtldr/stat-card";
import { PostPreviews } from "@/components/feedtldr/post-previews";
import {
  SETTINGS_CARD_HEIGHT,
  SettingsCard,
} from "@/components/feedtldr/settings/settings-card";
import { SummaryProse } from "@/components/feedtldr/summary-prose";
import { TagInput, type TagItem } from "@/components/feedtldr/tag-input";
import { UsageSummary } from "@/components/feedtldr/usage-summary";

const SAMPLE_SUMMARY = `
<h3>Funding and Valuations</h3>
<p>Investment in generative AI startups topped $3.9B in Q3, with two new
companies fundraising at multi-billion valuations and one research lab
spinning out a consumer product team.</p>
<ul>
  <li><a href="https://x.com/example/status/1">x.com/example/status/1</a></li>
  <li><a href="https://x.com/example/status/2">x.com/example/status/2</a></li>
</ul>
<h3>Practical Applications</h3>
<p>Grid operators are testing model-driven load balancing, and a major video
tool announced in-editor generation for both editing and creation.</p>
<ul>
  <li><a href="https://x.com/example/status/3">x.com/example/status/3</a></li>
</ul>`;

const SAMPLE_POSTS = [
  {
    url: "https://x.com/example/status/1",
    text: "Q3 numbers are in: generative AI startups raised $3.9B, and that is before the two mega-rounds close.\n\nFull breakdown in the thread below.",
    userName: "example",
    createdAt: "2026-08-17 08:12",
  },
  {
    url: "https://x.com/example/status/2",
    text: "Confirmed: the research lab is spinning out its consumer product team into a separate company.",
    userName: "example",
    createdAt: "2026-08-17 09:40",
  },
  {
    url: "https://x.com/example/status/3",
    text: "Grid operators in two EU countries are now testing model-driven load balancing in production.",
    userName: "example",
    createdAt: "2026-08-17 11:03",
  },
];

const ONBOARDING_STEPS = [
  "Your role",
  "Your goal",
  "What to follow",
  "Add accounts",
  "Daily email",
] as const;

const SAMPLE_ROWS = [
  {
    userName: "karpathy",
    createdAt: "2026-08-02 07:12",
    text: "A short note on why small models keep surprising us.",
    url: "https://x.com/example/status/1",
    likeCount: 4821,
    viewCount: 291043,
  },
  {
    userName: "simonw",
    createdAt: "2026-08-02 06:48",
    text: "Weeknotes: shipping a tiny tool that summarizes my own feed.",
    url: null,
    likeCount: 612,
    viewCount: 20488,
  },
];

const SAMPLE_BASIC_PLAN = {
  id: "basic",
  max_credits: 50,
  max_followers: 200,
  max_tweets_per_generation: 250,
  price_id_month: "price_basic_month",
  price_id_year: "price_basic_year",
  price_month: 4.99,
  price_year: 49.99,
};

const SAMPLE_PRO_PLAN = {
  id: "pro",
  max_credits: 100,
  max_followers: 500,
  max_tweets_per_generation: 700,
  price_id_month: "price_pro_month",
  price_id_year: "price_pro_year",
  price_month: 11.99,
  price_year: 119.99,
};

const SAMPLE_USAGE = {
  plan: "pro",
  credits: {
    monthly_left: 77,
    monthly_limit: 100,
    prepaid_left: 0,
    prepaid_limit: 0,
  },
  usage: {
    n_generations: 8,
    n_newsletters_sent: 14,
    n_chat_messages: 5,
    n_followers_scraped: 420,
  },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 border-t pt-10">
      <h2 className="text-section">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Chat panel pieces with local state: the empty state's tilted card and the
 * composer with removable/re-addable context cards. Wrapped in the same
 * `group/panel` + `data-state` the real panel uses so the reveal styles
 * resolve to their open position.
 */
function ChatPreview() {
  const [draft, setDraft] = useState("");
  const [context, setContext] = useState({ posts: true, summary: true });
  const cards: ChatContextCard[] = [
    {
      id: "posts",
      title: "Feed posts",
      subtitle: "Latest scrape",
      icon: <XLogo className="size-4" />,
      active: context.posts,
    },
    {
      id: "summary",
      title: "Summary",
      subtitle: "Latest summary",
      icon: <Article className="size-4" />,
      active: context.summary,
    },
  ];

  return (
    <div className="rounded-card border bg-background p-6">
      <div
        data-state="open"
        className="group/panel mx-auto flex w-full max-w-md flex-col gap-4 rounded-card border bg-card p-4"
      >
        <ChatEmptyState onPick={setDraft} disabled={false} />
        <ChatComposer
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={() => {
            toast.success(`Sent: ${draft}`);
            setDraft("");
          }}
          cards={cards}
          onToggleCard={(id) =>
            setContext((value) => ({ ...value, [id]: !value[id] }))
          }
        />
      </div>
    </div>
  );
}

/**
 * Living component gallery (DESIGN.md §8): every component in its states.
 * Dev-only surface for visual review; not linked from the product.
 */
export default function DesignGallery() {
  const [tags, setTags] = useState<TagItem[]>([
    { value: "@karpathy", state: "verified" },
    { value: "@simonw", state: "verified" },
    { value: "@notarealuser999", state: "not_found" },
    { value: "@paulg", state: "unverified" },
  ]);
  const [surveyRole, setSurveyRole] = useState<{
    selected: string[];
    other?: string;
  }>({ selected: ["Engineer"] });
  const [surveyTopics, setSurveyTopics] = useState<{
    selected: string[];
    other?: string;
  }>({ selected: ["AI & tech"], other: "Space" });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-display-lg">Design gallery</h1>
        <p className="text-muted-foreground">
          Every FeedTLDR component in every state. Tokens and rules live in
          docs/DESIGN.md.
        </p>
      </header>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="tonal">Tonal</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">Large</Button>
          <Button size="sm">Small</Button>
          <Button size="xs">Extra small</Button>
          <Button size="icon" aria-label="Icon button">
            ✦
          </Button>
        </div>
      </Section>

      <Section title="Brand">
        <div className="flex items-center gap-8">
          <Logo />
        </div>
      </Section>

      <Section title="Type scale">
        <div className="flex flex-col gap-4">
          <p className="text-display-xl">Display xl</p>
          <p className="text-display-lg">Display lg</p>
          <p className="text-heading">Heading</p>
          <p className="text-title">Title</p>
          <p className="text-section">Section</p>
          <p>Body</p>
          <p className="text-sm text-muted-foreground">Body small</p>
        </div>
      </Section>

      <Section title="Shape and elevation">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid size-24 place-items-center rounded-full border bg-card text-xs">
            pill
          </div>
          <div className="grid size-24 place-items-center rounded-card border bg-card text-xs">
            card
          </div>
          <div className="grid size-24 place-items-center rounded-field border bg-card text-xs">
            field
          </div>
          <div className="grid size-24 place-items-center rounded-card bg-card text-xs shadow-lift">
            lift
          </div>
          <div className="grid size-24 place-items-center rounded-card bg-card text-xs shadow-overlay">
            overlay
          </div>
        </div>
      </Section>

      <Section title="Inputs and forms">
        <FieldGroup className="max-w-md">
          <Field>
            <FieldLabel htmlFor="demo-input">Email</FieldLabel>
            <Input id="demo-input" placeholder="you@example.com" />
            <FieldDescription className="text-xs">
              We send the daily summary here.
            </FieldDescription>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="demo-invalid">With error</FieldLabel>
            <Input id="demo-invalid" aria-invalid placeholder="not-an-email" />
            <FieldError>Enter a valid email address.</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="demo-disabled">Disabled</FieldLabel>
            <Input id="demo-disabled" disabled placeholder="Not editable" />
          </Field>
          <Field>
            <FieldLabel htmlFor="demo-textarea">Custom AI prompt</FieldLabel>
            <Textarea
              id="demo-textarea"
              placeholder="Tell the AI what to focus on…"
              rows={3}
            />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel htmlFor="demo-switch">Fetch latest posts</FieldLabel>
            <Switch id="demo-switch" defaultChecked />
          </Field>
        </FieldGroup>
      </Section>

      <Section title="Viewport-height settings cards">
        <div className="flex flex-col gap-6">
          <SettingsCard
            description="Verify checks that each account exists on X."
            className={SETTINGS_CARD_HEIGHT.accounts}
            contentClassName="min-h-0 flex-1"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <TagInput
                items={[]}
                onAdd={() => {}}
                onRemove={() => {}}
                className="min-h-0 flex-1"
                listFooter={
                  <Button type="button" variant="outline" size="sm">
                    Import from an account
                  </Button>
                }
              />
              <EmptyState
                className="py-6"
                title="Nobody on the list yet"
                description="Add your favorite X accounts above, or import everyone you already follow in one go."
              />
            </div>
          </SettingsCard>

          <SettingsCard
            className={SETTINGS_CARD_HEIGHT.aiPrompt}
            contentClassName="min-h-0 flex-1"
          >
            <Textarea
              readOnly
              value="Focus on product launches, practical AI research, and thoughtful industry analysis."
              aria-label="Custom AI prompt preview"
              className="max-h-none min-h-64 flex-1 resize-none bg-card"
            />
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm">
                Edit
              </Button>
            </div>
          </SettingsCard>
        </div>
      </Section>

      <Section title="Toggle group">
        <ToggleGroup
          type="single"
          defaultValue="month"
          aria-label="Billing interval"
          className="bg-secondary p-1"
        >
          <ToggleGroupItem value="month">Monthly</ToggleGroupItem>
          <ToggleGroupItem value="year">Yearly</ToggleGroupItem>
        </ToggleGroup>
      </Section>

      <Section title="Notices">
        <div className="flex flex-col gap-3">
          <Notice tone="info" filled title="This is a demo summary.">
            <p>Generate your first summary to replace it.</p>
          </Notice>
          <Notice tone="warning" filled>
            Your plan allows up to 10 accounts.
          </Notice>
          <Notice tone="success" filled>
            All accounts verified.
          </Notice>
          <Notice tone="error">Verify at least one account first.</Notice>
        </div>
      </Section>

      <Section title="Getting started checklist">
        <div className="flex flex-col gap-6">
          <GettingStarted accountsDone={false} newsletterDone={false} onGenerate={() => toast("Generate dialog opens here")} onDismiss={() => toast("Dismissed")} />
          <GettingStarted accountsDone newsletterDone={false} onGenerate={() => toast("Generate dialog opens here")} onDismiss={() => toast("Dismissed")} />
          <GettingStarted accountsDone newsletterDone onGenerate={() => toast("Generate dialog opens here")} onDismiss={() => toast("Dismissed")} />
        </div>
      </Section>

      <Section title="Demo callout flap">
        {/* The flap tucks under the card that follows it (no gap between). */}
        <div className="flex flex-col">
          <DemoCallout />
          <Card className="gap-2 border-none p-6 sm:p-8">
            <h3 className="text-title">Example brief</h3>
            <p className="text-sm text-muted-foreground">
              The summary card content sits on top of the flap&apos;s lower
              padding.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Busy states">
        <div className="flex flex-wrap items-center gap-6">
          <Spinner label="Loading" className="size-5 text-muted-foreground" />
          <Button disabled>
            <Spinner /> Starting…
          </Button>
        </div>
      </Section>

      <Section title="Page header">
        <PageHeader
          title="Today's Feed"
          description="Generated on 2 August 2026, 07:04 CEST"
        />
      </Section>

      <Section title="Onboarding steps">
        <div className="flex flex-col gap-6">
          <OnboardingSteps steps={ONBOARDING_STEPS} current={0} />
          <OnboardingSteps steps={ONBOARDING_STEPS} current={2} />
          <OnboardingSteps steps={ONBOARDING_STEPS} current={4} />
        </div>
      </Section>

      <Section title="Survey question">
        <div className="flex flex-col gap-5">
          <SurveyQuestion
            label="What best describes you? (single choice)"
            options={["Founder", "Engineer", "Marketer", "Investor"]}
            value={surveyRole.selected}
            otherValue={surveyRole.other}
            onChange={(selected, other) => setSurveyRole({ selected, other })}
          />
          <SurveyQuestion
            label="What do you want to follow? (multiple choice, Other open)"
            options={["My product or brand", "My industry", "AI & tech"]}
            multiple
            value={surveyTopics.selected}
            otherValue={surveyTopics.other}
            onChange={(selected, other) => setSurveyTopics({ selected, other })}
          />
          <SurveyQuestion
            label="Disabled question"
            options={["Option A", "Option B"]}
            value={[]}
            onChange={() => {}}
            disabled
          />
        </div>
      </Section>

      <Section title="Source data table">
        <SourceDataTable rows={SAMPLE_ROWS} />
      </Section>

      <Section title="Account chips + tag input">
        <TagInput
          items={tags}
          onAdd={(values) =>
            setTags((prev) => [
              ...prev,
              ...values.map((v) => ({
                value: v.startsWith("@") ? v : `@${v}`,
              })),
            ])
          }
          onRemove={(value) =>
            setTags((prev) => prev.filter((t) => t.value !== value))
          }
        />
        <div className="flex flex-wrap gap-2">
          <AccountChip handle="@verified" state="verified" />
          <AccountChip handle="@pending" state="unverified" />
          <AccountChip handle="@missing" state="not_found" />
        </div>
        {/* Suggestions: dashed outline separates them from list chips. */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            Suggested for you
          </p>
          <div className="flex flex-wrap gap-2">
            <SuggestionChip
              handle="karpathy"
              onAdd={(handle) => toast.success(`Added @${handle}`)}
            />
            <SuggestionChip
              handle="paulg"
              onAdd={(handle) => toast.success(`Added @${handle}`)}
            />
            <SuggestionChip handle="disabled" onAdd={() => {}} disabled />
          </div>
        </div>
        {/* Empty list: how AccountsField invites a brand-new user in. */}
        <div className="flex flex-col gap-3">
          <TagInput items={[]} onAdd={() => {}} onRemove={() => {}} />
          <EmptyState
            className="py-6"
            title="Nobody on the list yet"
            description="Add your favorite X accounts above, or import everyone you already follow in one go."
          />
        </div>
      </Section>

      <Section title="Badges and credits">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="rounded-full bg-pastel-green text-pastel-green-foreground">
            Verified
          </Badge>
          <Badge className="rounded-full bg-pastel-yellow text-pastel-yellow-foreground">
            Pending
          </Badge>
          <Badge className="rounded-full bg-pastel-red text-pastel-red-foreground">
            Failed
          </Badge>
          <Badge className="rounded-full bg-pastel-blue text-pastel-blue-foreground">
            Info
          </Badge>
          <CreditBadge cost={24} remaining={51} />
        </div>
      </Section>

      <Section title="App bar">
        <div className="rounded-card border bg-background">
          <AppBar
            email="pablo@example.com"
            name="Pablo"
            plan="pro"
            onRegenerate={() => toast.success("Re-generate pressed")}
            onToggleChat={() => toast.info("Chat panel would toggle")}
            chatOpen={false}
          />
        </div>
        {/* Blocked state: no accounts yet, Re-generate disabled + tooltip. */}
        <div className="rounded-card border bg-background">
          <AppBar
            email="pablo@example.com"
            name="Pablo"
            plan="free"
            onRegenerate={() => toast.success("Re-generate pressed")}
            onToggleChat={() => toast.info("Chat panel would toggle")}
            chatOpen={false}
            regenerateBlockedReason="You have no accounts to summarize. Add accounts first."
          />
        </div>
      </Section>

      <Section title="AI chat">
        <ChatPreview />
      </Section>

      <Section title="Plan cards">
        <div className="grid gap-6 sm:grid-cols-2">
          <PlanCard
            plan={SAMPLE_BASIC_PLAN}
            interval="month"
            isSignedIn
            isCurrent={false}
            currentPlan="pro"
            availableCredits={77}
            isBusy={false}
            onAction={() => toast.info("Plan action")}
          />
          <PlanCard
            plan={SAMPLE_PRO_PLAN}
            interval="month"
            isSignedIn
            isCurrent
            currentPlan="pro"
            availableCredits={77}
            isBusy={false}
            onAction={() => toast.info("Plan action")}
          />
        </div>
      </Section>

      <Section title="Usage summary">
        <UsageSummary usage={SAMPLE_USAGE} />
      </Section>

      <Section title="Summary prose + audio">
        <AudioPill src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=" />
        <Card>
          <CardContent>
            <PostPreviews posts={SAMPLE_POSTS}>
              <SummaryProse html={SAMPLE_SUMMARY} />
            </PostPreviews>
          </CardContent>
        </Card>
      </Section>

      <Section title="Generation progress">
        <div className="grid gap-8 sm:grid-cols-2">
          <GenerationProgress
            currentStage="summarization"
            stagesCompleted={["data_collection"]}
          />
          <GenerationProgress
            currentStage="starting"
            stagesCompleted={[]}
            error="No posts found for your accounts in the last 24 hours."
          />
        </div>
      </Section>

      <Section title="Stats">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total posts" value={1284} />
          <StatCard label="Total likes" value={48213} />
          <StatCard label="Total views" value={1204567} />
        </div>
      </Section>

      <Section title="Overlays">
        <div className="flex flex-wrap gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open settings sheet</Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-sheet bg-background">
              <SheetHeader>
                <SheetTitle>Settings</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      List the accounts you want to follow
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input placeholder="Enter an account and press Enter" />
                  </CardContent>
                </Card>
              </div>
            </SheetContent>
          </Sheet>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate a new summary?</DialogTitle>
                <DialogDescription>
                  This costs 24 credits. You have 51 left.
                </DialogDescription>
              </DialogHeader>
              <Button onClick={() => toast.success("Generation started")}>
                Generate
              </Button>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => toast("A quiet toast")}>
            Show toast
          </Button>
        </div>
      </Section>

      <Section title="Tabs, loading, empty">
        <Tabs defaultValue="summary" className="max-w-md">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="data">Source data</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="pt-4">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </TabsContent>
          <TabsContent value="data" className="pt-4 text-sm text-muted-foreground">
            Source data table renders here.
          </TabsContent>
        </Tabs>
        <Separator />
        <EmptyState
          title="No summary yet"
          description="Add the accounts you want to follow, then generate your first feed summary."
          action={<Button>Open settings</Button>}
        />
      </Section>
    </main>
  );
}
