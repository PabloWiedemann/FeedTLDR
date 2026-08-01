"use client";

import { useState } from "react";
import { CircleNotch, DownloadSimple, SealCheck } from "@phosphor-icons/react";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "./tag-input";
import {
  useAccounts,
  useAddAccounts,
  useImportFollowees,
  useRemoveAccount,
  useSettings,
  useUpdateSettings,
  useVerifyAccounts,
} from "@/lib/hooks";

const TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

/**
 * Settings sheet (mock 3): accounts card, newsletter email card, AI prompt
 * card, timezone, and a Re-generate action at the bottom.
 */
export function SettingsSheet({
  open,
  onOpenChange,
  onRegenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegenerate: () => void;
}) {
  const accounts = useAccounts(open);
  const settings = useSettings(open);
  const addAccounts = useAddAccounts();
  const removeAccount = useRemoveAccount();
  const verifyAccounts = useVerifyAccounts();
  const importFollowees = useImportFollowees();
  const updateSettings = useUpdateSettings();

  const [email, setEmail] = useState("");
  const [prompt, setPrompt] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [importOpen, setImportOpen] = useState(false);
  const [importSource, setImportSource] = useState("");

  // Hydrate local form state when settings load (adjust-during-render pattern)
  const [hydratedFrom, setHydratedFrom] = useState<typeof settings.data>(undefined);
  if (settings.data && settings.data !== hydratedFrom) {
    setHydratedFrom(settings.data);
    setEmail(settings.data.newsletter_email ?? "");
    setPrompt(settings.data.ai_prompt ?? "");
    setTimezone(settings.data.timezone ?? "America/New_York");
  }

  const verified = new Set(accounts.data?.verified_accounts ?? []);
  const items = (accounts.data?.accounts ?? []).map((handle) => ({
    value: handle,
    state: verified.has(handle) ? ("verified" as const) : ("unverified" as const),
  }));
  const unverifiedCount = items.filter((i) => i.state !== "verified").length;
  const atLimit =
    accounts.data !== undefined &&
    accounts.data.accounts.length >= accounts.data.max_accounts;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-full gap-0 overflow-y-auto bg-background sm:max-w-[520px]"
      >
        <SheetHeader>
          <SheetTitle className="text-lg">Settings</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-8">
          {/* ---------- accounts ---------- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                List the accounts you want to follow
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <TagInput
                items={items}
                onAdd={(values) => addAccounts.mutate(values)}
                onRemove={(value) => removeAccount.mutate(value)}
                disabled={addAccounts.isPending || atLimit}
              />
              {atLimit && (
                <p className="text-xs text-pastel-yellow-foreground">
                  Your plan allows up to {accounts.data?.max_accounts} accounts.
                  Remove some or upgrade to add more.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => verifyAccounts.mutate()}
                  disabled={verifyAccounts.isPending || unverifiedCount === 0}
                >
                  {verifyAccounts.isPending ? (
                    <CircleNotch className="animate-spin" />
                  ) : (
                    <SealCheck />
                  )}
                  Verify accounts
                  {unverifiedCount > 0 ? ` (${unverifiedCount})` : ""}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setImportOpen(true)}
                >
                  <DownloadSimple /> Import from an account
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ---------- newsletter ---------- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Get the daily email with summaries of the most relevant posts
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Newsletter email"
                />
                <Button
                  type="button"
                  onClick={() => updateSettings.mutate({ newsletter_email: email })}
                  disabled={updateSettings.isPending}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                To unsubscribe, clear the email above and save.
              </p>
            </CardContent>
          </Card>

          {/* ---------- AI prompt ---------- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Customize the AI prompt
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={8}
                placeholder="Tell the AI what to prioritize in your summaries…"
                aria-label="Custom AI prompt"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateSettings.mutate({ ai_prompt: prompt })}
                  disabled={updateSettings.isPending}
                >
                  Save prompt
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ---------- timezone ---------- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Timezone</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Label htmlFor="timezone-select" className="sr-only">
                Timezone
              </Label>
              <Select
                value={timezone}
                onValueChange={(value) => {
                  setTimezone(value);
                  updateSettings.mutate({ timezone: value });
                }}
              >
                <SelectTrigger id="timezone-select" className="w-full">
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Daily newsletters arrive around 7am in your timezone, on
                weekdays.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-center pt-2">
            <Button
              type="button"
              size="lg"
              onClick={() => {
                onOpenChange(false);
                onRegenerate();
              }}
            >
              Re-generate
            </Button>
          </div>
        </div>

        {/* ---------- import dialog ---------- */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import accounts</DialogTitle>
              <DialogDescription>
                Add every account that a given X account follows. One account at
                a time.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input
                value={importSource}
                onChange={(e) => setImportSource(e.target.value)}
                placeholder="@youraccount"
                aria-label="Account to import followees from"
              />
              <Button
                type="button"
                onClick={() => {
                  importFollowees.mutate(importSource, {
                    onSuccess: () => {
                      setImportOpen(false);
                      setImportSource("");
                    },
                  });
                }}
                disabled={
                  importFollowees.isPending || importSource.trim() === ""
                }
              >
                {importFollowees.isPending ? (
                  <>
                    <CircleNotch className="animate-spin" /> Importing…
                  </>
                ) : (
                  "Import followed accounts"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
