"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "../spinner";
import { UsageSummary } from "../usage-summary";
import { SettingsCard } from "./settings-card";
import { logout } from "@/lib/firebase";
import { useBillingUsage, useMe } from "@/lib/api/queries";
import {
  useBillingPortal,
  useDeleteAccount,
  useUpdateMe,
} from "@/lib/api/mutations";
import { creditsLeft } from "@/lib/credits";
import { useSyncedState } from "@/lib/use-synced-state";
import type { Me } from "@/lib/api/types";

/** Name + signed-in email. */
export function ProfileDetailsCard() {
  const me = useMe();
  const updateMe = useUpdateMe();
  const [name, setName] = useSyncedState(me.data, (data) => data.name ?? "", "");

  if (me.isLoading) {
    return (
      <SettingsCard title="Your details">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-16" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-11 flex-1 rounded-field" />
            <Skeleton className="h-10 w-20 shrink-0 rounded-full" />
          </div>
          <Skeleton className="h-4 w-56" />
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard title="Your details">
      <Field>
        <FieldLabel htmlFor="profile-name">Name</FieldLabel>
        <div className="flex items-center gap-2">
          <Input
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button
            onClick={() => updateMe.mutate({ name })}
            disabled={updateMe.isPending || name === (me.data?.name ?? "")}
          >
            Save
          </Button>
        </div>
      </Field>
      <p className="text-sm text-muted-foreground">
        Signed in as {me.data?.email ?? "…"}
      </p>
    </SettingsCard>
  );
}

/** Typed-email confirmation: deletion is irreversible, so it asks for proof. */
function DeleteAccountDialog({
  open,
  onOpenChange,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const deleteAccount = useDeleteAccount();

  function confirmDeletion() {
    deleteAccount.mutate(undefined, {
      onSuccess: async () => {
        await logout().catch(() => undefined);
        router.replace("/");
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            Type your email ({email}) to confirm. We&rsquo;ll send a
            confirmation email once it&rsquo;s done.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={email || "your email"}
            aria-label="Type your email to confirm deletion"
          />
          <Button
            variant="destructive"
            disabled={deleteAccount.isPending || confirmation !== email}
            onClick={confirmDeletion}
          >
            {deleteAccount.isPending && <Spinner />}
            Permanently delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Account deletion behind a typed confirmation. */
export function DangerZoneCard() {
  const me = useMe();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <SettingsCard title="Danger zone" destructive>
      <p className="text-sm text-muted-foreground text-pretty">
        Deleting your account removes your login, settings, and generated
        summaries. This cannot be undone.
      </p>
      <div>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          Delete account
        </Button>
      </div>
      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        email={me.data?.email ?? ""}
      />
    </SettingsCard>
  );
}

function PlanSummary({ me }: { me: Me }) {
  const portal = useBillingPortal();
  return (
    <>
      <p className="text-sm">
        You are on the{" "}
        <span className="font-medium capitalize">
          {me.plan === "free" ? "free trial" : me.plan}
        </span>{" "}
        with{" "}
        <span className="font-medium tabular-nums">
          {creditsLeft(me.credits)}
        </span>{" "}
        credits left{me.plan === "free" ? "." : " this period."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/pricing">See plans</Link>
        </Button>
        {me.plan !== "free" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
          >
            Manage subscription
          </Button>
        )}
      </div>
    </>
  );
}

/** Current plan, credits left, and the way to plans or the Stripe portal. */
export function PlanCreditsCard() {
  const me = useMe();

  return (
    <SettingsCard
      title="Plan and credits"
      description="Credits pay for new summaries and chat messages."
    >
      {me.data ? (
        <PlanSummary me={me.data} />
      ) : (
        <Skeleton className="h-16 w-full" />
      )}
    </SettingsCard>
  );
}

/** What the current billing period has consumed so far. */
export function BillingUsage() {
  const usage = useBillingUsage(true);

  if (usage.isLoading) {
    return <Skeleton className="h-40 w-full rounded-card" />;
  }
  if (!usage.data) return null;
  return <UsageSummary usage={usage.data} />;
}
