"use client";

import { AiPromptCard } from "@/components/feedtldr/settings/summary-cards";
import { SettingsPageHeader } from "@/components/feedtldr/settings/settings-card";

export default function PromptSettingsPage() {
  return (
    <>
      <SettingsPageHeader
        title="AI prompt"
        description="Tell the AI what to focus on. It applies to every new summary."
      />
      <AiPromptCard />
    </>
  );
}
