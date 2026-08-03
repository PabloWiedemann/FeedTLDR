"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import {
  AccountsField,
  ImportAccountsDialog,
  VerifyAccountsButton,
} from "./accounts-field";
import { useSettings } from "@/lib/api/queries";
import { useUpdateSettings } from "@/lib/api/mutations";
import { DEFAULT_TIMEZONE, TIMEZONES, timezoneLabel } from "@/lib/timezones";
import { useSyncedState } from "@/lib/use-synced-state";

/** Each settings group is a white card on the sheet's cream panel (mock 3). */
function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

/**
 * Settings sheet (mock 3): accounts, newsletter email, AI prompt, timezone,
 * and a Re-generate action at the bottom. Queries only run while it is open.
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
  const settings = useSettings(open);
  const updateSettings = useUpdateSettings();

  const [email, setEmail] = useSyncedState(
    settings.data,
    (data) => data.newsletter_email ?? "",
    ""
  );
  const [prompt, setPrompt] = useSyncedState(
    settings.data,
    (data) => data.ai_prompt ?? "",
    ""
  );
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-full gap-0 overflow-y-auto bg-background sm:max-w-sheet"
      >
        <SheetHeader>
          <SheetTitle className="text-lg">Settings</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-8">
          <SettingsCard title="List the accounts you want to follow">
            <AccountsField enabled={open} />
            <div className="flex flex-wrap gap-2">
              <VerifyAccountsButton enabled={open} />
              <ImportAccountsDialog />
            </div>
          </SettingsCard>

          <SettingsCard title="Get the daily email with summaries of the most relevant posts">
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                aria-label="Newsletter email"
              />
              <Button
                type="button"
                onClick={() =>
                  updateSettings.mutate({ newsletter_email: email })
                }
                disabled={updateSettings.isPending}
              >
                Save
              </Button>
            </div>
            <FieldDescription className="text-xs">
              To unsubscribe, clear the email above and save.
            </FieldDescription>
          </SettingsCard>

          <SettingsCard title="Customize the AI prompt">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
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
          </SettingsCard>

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
                Daily newsletters arrive around 7am in your timezone, on
                weekdays.
              </FieldDescription>
            </Field>
          </SettingsCard>

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
      </SheetContent>
    </Sheet>
  );
}
