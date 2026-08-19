"use client";

import { AccountsCard } from "@/components/feedtldr/settings/summary-cards";
import { SettingsPageHeader } from "@/components/feedtldr/settings/settings-card";

export default function AccountsSettingsPage() {
  return (
    <>
      <SettingsPageHeader
        title="Accounts"
        description="Add the X accounts you want us to read. Each day we collect their new posts and turn them into your daily summary."
      />
      <AccountsCard />
    </>
  );
}
