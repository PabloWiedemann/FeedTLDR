"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AccountsField } from "../accounts-field";
import { SettingsCard } from "./settings-card";
import { useSettings } from "@/lib/api/queries";
import { useUpdateSettings } from "@/lib/api/mutations";
import { DEFAULT_TIMEZONE, TIMEZONES, timezoneLabel } from "@/lib/timezones";
import { useSyncedState } from "@/lib/use-synced-state";

/** The X accounts behind the daily summary, with verify/import/clear. */
export function AccountsCard() {
  return (
    <SettingsCard
      description="Verify checks that each account exists on X."
      className="lg:h-[calc(100dvh-15rem)]"
      contentClassName="min-h-0 flex-1"
    >
      <AccountsField
        withActions
        className="min-h-0 flex-1"
        listClassName="max-h-none min-h-0 flex-1"
      />
    </SettingsCard>
  );
}

/**
 * Custom AI prompt: read-only until Edit is pressed. While there are
 * unsaved edits, refreshing/closing triggers the browser warning and
 * in-app navigation is intercepted with a save/discard/stay dialog.
 */
export function AiPromptCard() {
  const router = useRouter();
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const [prompt, setPrompt] = useSyncedState(
    settings.data,
    (data) => data.ai_prompt ?? "",
    ""
  );
  const [editing, setEditing] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const saved = settings.data?.ai_prompt ?? "";
  const dirty = editing && prompt !== saved;

  // Refresh / tab close: the browser's native unsaved-changes warning.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // In-app navigation: catch link clicks (capture phase, before the Next
  // router) and route the decision through the dialog instead.
  useEffect(() => {
    if (!dirty) return;
    const intercept = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      const href = anchor?.getAttribute("href");
      if (!href || !href.startsWith("/") || href === window.location.pathname)
        return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
    };
    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, [dirty]);

  function startEditing() {
    setEditing(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function stopEditing() {
    setPrompt(saved);
    setEditing(false);
  }

  function save(onDone?: () => void) {
    updateSettings.mutate(
      { ai_prompt: prompt },
      {
        onSuccess: () => {
          setEditing(false);
          onDone?.();
        },
      }
    );
  }

  function leaveAndDiscard() {
    const href = pendingHref;
    stopEditing();
    setPendingHref(null);
    if (href) router.push(href);
  }

  function leaveAndSave() {
    const href = pendingHref;
    save(() => {
      setPendingHref(null);
      if (href) router.push(href);
    });
  }

  if (settings.isLoading) {
    return (
      <SettingsCard
        className="lg:h-[calc(100dvh-13.5rem)]"
        contentClassName="min-h-0 flex-1"
      >
        <Skeleton className="min-h-64 w-full flex-1 rounded-field" />
      </SettingsCard>
    );
  }

  return (
    <SettingsCard
      className="lg:h-[calc(100dvh-13.5rem)]"
      contentClassName="min-h-0 flex-1"
    >
      <Textarea
        ref={textareaRef}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        readOnly={!editing}
        placeholder="Tell the AI what to prioritize in your summaries…"
        aria-label="Custom AI prompt"
        className="max-h-none min-h-64 flex-1 resize-none bg-card"
      />
      {editing ? (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={stopEditing}
            disabled={updateSettings.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => save()}
            disabled={updateSettings.isPending || !dirty}
          >
            Save prompt
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startEditing}
          >
            <PencilSimple /> Edit
          </Button>
        </div>
      )}

      <Dialog
        open={pendingHref !== null}
        onOpenChange={(open) => !open && setPendingHref(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You have unsaved changes</DialogTitle>
            <DialogDescription>
              Your prompt has edits that are not saved yet.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setPendingHref(null)}>
              Keep editing
            </Button>
            <Button variant="outline" onClick={leaveAndDiscard}>
              Leave and discard
            </Button>
            <Button onClick={leaveAndSave} disabled={updateSettings.isPending}>
              Save and leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SettingsCard>
  );
}

/**
 * Newsletter subscription with one fixed-width state slot: a Subscribed
 * label when the saved email is in the field, Update once it changes,
 * Subscribe when there is no subscription yet.
 */
export function DailyEmailCard() {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const [email, setEmail] = useSyncedState(
    settings.data,
    (data) => data.newsletter_email ?? "",
    ""
  );
  const savedEmail = settings.data?.newsletter_email ?? "";
  const subscribed = savedEmail !== "";
  const emailDirty = email.trim() !== savedEmail;

  if (settings.isLoading) {
    return (
      <SettingsCard>
        <div className="flex items-center gap-2">
          <Skeleton className="h-11 flex-1 rounded-field" />
          <Skeleton className="h-10 w-32 shrink-0 rounded-full" />
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard>
      <div className="flex items-center gap-2">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          aria-label="Newsletter email"
        />
        {/* Fixed-width slot so the input never resizes between states. */}
        <div className="w-32 shrink-0">
          {subscribed && !emailDirty ? (
            <span className="flex h-10 w-full items-center justify-center rounded-full bg-pastel-green text-sm font-medium text-pastel-green-foreground">
              Subscribed
            </span>
          ) : (
            <Button
              type="button"
              className="w-full"
              onClick={() => updateSettings.mutate({ newsletter_email: email })}
              disabled={updateSettings.isPending || email.trim() === ""}
            >
              {subscribed ? "Update" : "Subscribe"}
            </Button>
          )}
        </div>
      </div>
      {subscribed && (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              setEmail("");
              updateSettings.mutate({ newsletter_email: "" });
            }}
            disabled={updateSettings.isPending}
          >
            Unsubscribe
          </Button>
        </div>
      )}
    </SettingsCard>
  );
}

/** Delivery timezone: the daily email arrives around 7am in this zone. */
export function TimezoneCard() {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const [timezone, setTimezone] = useSyncedState(
    settings.data,
    (data) => data.timezone ?? DEFAULT_TIMEZONE,
    DEFAULT_TIMEZONE
  );

  function selectTimezone(value: string) {
    setTimezone(value);
    updateSettings.mutate({ timezone: value });
  }

  if (settings.isLoading) {
    return (
      <SettingsCard title="Timezone">
        <Skeleton className="h-11 w-full rounded-field" />
      </SettingsCard>
    );
  }

  return (
    <SettingsCard title="Timezone">
      <Field>
        <FieldLabel htmlFor="timezone-select" className="sr-only">
          Timezone
        </FieldLabel>
        <Select value={timezone} onValueChange={selectTimezone}>
          <SelectTrigger id="timezone-select" className="w-full">
            <SelectValue placeholder="Select your timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((zone) => (
              <SelectItem key={zone} value={zone}>
                {timezoneLabel(zone)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription className="text-xs">
          Daily emails arrive around 7am in your timezone, on weekdays.
        </FieldDescription>
      </Field>
    </SettingsCard>
  );
}
