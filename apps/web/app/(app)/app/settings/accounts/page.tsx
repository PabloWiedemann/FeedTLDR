"use client";

import { AccountsBucket } from "@/components/feedtldr/accounts-bucket";
import { SettingsPageHeader } from "@/components/feedtldr/settings/settings-card";

export default function AccountsSettingsPage() {
  return (
    <>
      <SettingsPageHeader
        title="Following these accounts"
        description="Add the X accounts you want us to read. Each day we collect their new posts and turn them into your daily summary."
      />
      <AccountsBucket />
    </>
  );
}
