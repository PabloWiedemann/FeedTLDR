"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { AccountChip } from "@/components/feedtldr/account-chip";
import { AppBar } from "@/components/feedtldr/app-bar";
import { AudioPill } from "@/components/feedtldr/audio-pill";
import { CreditBadge } from "@/components/feedtldr/credit-badge";
import { EmptyState } from "@/components/feedtldr/empty-state";
import { GenerationProgress } from "@/components/feedtldr/generation-progress";
import { Logo } from "@/components/feedtldr/logo";
import { StatCard } from "@/components/feedtldr/stat-card";
import { SummaryProse } from "@/components/feedtldr/summary-prose";
import { TagInput, type TagItem } from "@/components/feedtldr/tag-input";

const SAMPLE_SUMMARY = `
<h3>Funding and Valuations</h3>
<p>Investment in generative AI startups topped $3.9B in Q3, with two new
companies fundraising at multi-billion valuations and one research lab
spinning out a consumer product team.</p>
<ul>
  <li><a href="#">x.com/example/status/1</a></li>
  <li><a href="#">x.com/example/status/2</a></li>
</ul>
<h3>Practical Applications</h3>
<p>Grid operators are testing model-driven load balancing, and a major video
tool announced in-editor generation for both editing and creation.</p>
<ul>
  <li><a href="#">x.com/example/status/3</a></li>
</ul>`;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 border-t pt-10">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold">Design gallery</h1>
        <p className="text-muted-foreground">
          Every FeedTLDR component in every state. Tokens and rules live in
          docs/DESIGN.md.
        </p>
      </header>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
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

      <Section title="Inputs and forms">
        <div className="grid max-w-md gap-5">
          <div className="grid gap-2">
            <Label htmlFor="demo-input">Email</Label>
            <Input id="demo-input" placeholder="you@example.com" />
            <p className="text-xs text-muted-foreground">
              We send the daily summary here.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="demo-invalid">With error</Label>
            <Input id="demo-invalid" aria-invalid placeholder="not-an-email" />
            <p className="text-xs font-medium text-destructive">
              Enter a valid email address.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="demo-textarea">Custom AI prompt</Label>
            <Textarea
              id="demo-textarea"
              placeholder="Tell the AI what to focus on…"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="demo-switch" defaultChecked />
            <Label htmlFor="demo-switch">Fetch latest posts</Label>
          </div>
        </div>
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
        <div className="rounded-3xl border bg-background">
          <AppBar
            email="pablo@example.com"
            name="Pablo"
            onOpenSettings={() => toast.info("Settings would open")}
            onRegenerate={() => toast.success("Re-generate pressed")}
          />
        </div>
      </Section>

      <Section title="Summary prose + audio">
        <AudioPill src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=" />
        <Card>
          <CardContent>
            <SummaryProse html={SAMPLE_SUMMARY} />
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
            <SheetContent side="left" className="w-full max-w-[520px] bg-background">
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
