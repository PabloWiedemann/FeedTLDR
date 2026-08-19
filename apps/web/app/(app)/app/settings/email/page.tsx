"use client";

import {
  DailyEmailCard,
  TimezoneCard,
} from "@/components/feedtldr/settings/summary-cards";
import { SettingsPageHeader } from "@/components/feedtldr/settings/settings-card";

export default function EmailSettingsPage() {
  return (
    <>
      <SettingsPageHeader
        title="Daily email"
        description="Get your daily summary in your inbox at 7am on weekdays."
      />
      <DailyEmailCard />
      <TimezoneCard />
    </>
  );
}
