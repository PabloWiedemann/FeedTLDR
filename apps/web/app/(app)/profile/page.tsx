"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/feedtldr/spinner";
import { logout } from "@/lib/firebase";
import { useMe } from "@/lib/api/queries";
import {
  useBillingPortal,
  useDeleteAccount,
  useUpdateMe,
} from "@/lib/api/mutations";
import { creditsLeft } from "@/lib/credits";
import { useSyncedState } from "@/lib/use-synced-state";
import type { Me } from "@/lib/api/types";

function ProfileCard({
  title,
  children,
  destructive,
}: {
  title: string;
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <Card className={destructive ? "border-destructive/30" : undefined}>
      <CardHeader>
        <CardTitle
          className={`text-base font-medium${destructive ? " text-destructive" : ""}`}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function PlanSummary({ me }: { me: Me }) {
  const portal = useBillingPortal();
  return (
    <>
      <p className="text-sm">
        You are on the <span className="font-medium capitalize">{me.plan}</span>{" "}
        plan with{" "}
        <span className="font-medium tabular-nums">
          {creditsLeft(me.credits)}
        </span>{" "}
        credits left this period.
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

export default function ProfilePage() {
  const me = useMe();
  const updateMe = useUpdateMe();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useSyncedState(me.data, (data) => data.name ?? "", "");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-10">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/app">
            <ArrowLeft /> Back to summary
          </Link>
        </Button>
      </div>
      <h1 className="text-heading">Profile</h1>

      <ProfileCard title="Account">
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
      </ProfileCard>

      <ProfileCard title="Plan &amp; credits">
        {me.data ? (
          <PlanSummary me={me.data} />
        ) : (
          <Spinner label="Loading your plan" className="size-4 text-muted-foreground" />
        )}
      </ProfileCard>

      <ProfileCard title="Danger zone" destructive>
        <p className="text-sm text-muted-foreground text-pretty">
          Deleting your account removes your login, settings, and generated
          summaries. This cannot be undone.
        </p>
        <div>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
        </div>
      </ProfileCard>

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        email={me.data?.email ?? ""}
      />
    </main>
  );
}
