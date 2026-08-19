"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AccountsField } from "../accounts-field";
import { SettingsCard } from "./settings-card";
import { useSettings } from "@/lib/api/queries";
import { useUpdateSettings } from "@/lib/api/mutations";
import { DEFAULT_TIMEZONE, TIMEZONES, timezoneLabel } from "@/lib/timezones";
import { useSyncedState } from "@/lib/use-synced-state";
import { cn } from "@/lib/utils";

/** The X accounts behind the daily summary, with verify/import/clear. */
export function AccountsCard() {
  return (
    <SettingsCard description="Verify checks that each account exists on X.">
      <AccountsField withActions listClassName="max-h-96" />
    </SettingsCard>
  );
}

/** Custom AI prompt; the save action appears only once the text changed. */
export function AiPromptCard() {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const [prompt, setPrompt] = useSyncedState(
    settings.data,
    (data) => data.ai_prompt ?? "",
    ""
  );
  const promptDirty = prompt !== (settings.data?.ai_prompt ?? "");

  return (
    <SettingsCard>
      <Textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={12}
        placeholder="Tell the AI what to prioritize in your summaries…"
        aria-label="Custom AI prompt"
      />
      {/* Kept in the layout so the card height is stable; visible only
          once the prompt actually changed. */}
      <div className={cn("flex justify-end", !promptDirty && "invisible")}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => updateSettings.mutate({ ai_prompt: prompt })}
          disabled={updateSettings.isPending || !promptDirty}
        >
          Save prompt
        </Button>
      </div>
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
