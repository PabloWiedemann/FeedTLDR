"use client";

import {
  BillingUsage,
  PlanCreditsCard,
} from "@/components/feedtldr/settings/account-cards";
import { SettingsPageHeader } from "@/components/feedtldr/settings/settings-card";

export default function BillingSettingsPage() {
  return (
    <>
      <SettingsPageHeader
        title="Billing"
        description="Your plan, your credits, and what this period used."
      />
      <PlanCreditsCard />
      <BillingUsage />
    </>
  );
}
