"use client";

import {
  DangerZoneCard,
  ProfileDetailsCard,
} from "@/components/feedtldr/settings/account-cards";
import { SettingsPageHeader } from "@/components/feedtldr/settings/settings-card";

export default function ProfileSettingsPage() {
  return (
    <>
      <SettingsPageHeader
        title="Profile"
        description="Your name and the email you sign in with."
      />
      <ProfileDetailsCard />
      <DangerZoneCard />
    </>
  );
}
