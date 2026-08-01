"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleNotch } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { logout } from "@/lib/firebase";
import { useMe, useUpdateMe } from "@/lib/hooks";

export default function ProfilePage() {
  const router = useRouter();
  const me = useMe();
  const updateMe = useUpdateMe();
  const [name, setName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Hydrate the name field when profile data loads (adjust-during-render)
  const [hydratedFrom, setHydratedFrom] = useState<typeof me.data>(undefined);
  if (me.data && me.data !== hydratedFrom) {
    setHydratedFrom(me.data);
    setName(me.data.name ?? "");
  }

  async function openPortal() {
    const result = await api.POST("/v1/billing/portal");
    if (result.data?.url) {
      window.location.assign(result.data.url);
    } else {
      toast.error("Could not open the billing portal.");
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    const result = await api.DELETE("/v1/me");
    if (result.error) {
      setDeleting(false);
      toast.error("Could not delete the account. Contact support.");
      return;
    }
    await logout().catch(() => undefined);
    router.replace("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-10">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/app">
            <ArrowLeft /> Back to summary
          </Link>
        </Button>
      </div>
      <h1 className="text-3xl font-semibold">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="profile-name">Name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button
                onClick={() => updateMe.mutate({ name })}
                disabled={updateMe.isPending || name === (me.data?.name ?? "")}
              >
                Save
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Signed in as {me.data?.email ?? "…"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Plan &amp; credits</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {me.data ? (
            <>
              <p className="text-sm">
                You are on the{" "}
                <span className="font-medium capitalize">{me.data.plan}</span>{" "}
                plan with{" "}
                <span className="font-medium tabular-nums">
                  {me.data.credits.monthly_left + me.data.credits.prepaid_left}
                </span>{" "}
                credits left this period.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/pricing">See plans</Link>
                </Button>
                {me.data.plan !== "free" && (
                  <Button variant="outline" size="sm" onClick={openPortal}>
                    Manage subscription
                  </Button>
                )}
              </div>
            </>
          ) : (
            <CircleNotch className="size-4 animate-spin text-muted-foreground" />
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base font-medium text-destructive">
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Deleting your account removes your login, settings, and generated
            summaries. This cannot be undone.
          </p>
          <div>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Type your email ({me.data?.email}) to confirm. We&rsquo;ll send a
              confirmation email once it&rsquo;s done.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={me.data?.email ?? "your email"}
              aria-label="Type your email to confirm deletion"
            />
            <Button
              variant="destructive"
              disabled={deleting || confirmText !== me.data?.email}
              onClick={deleteAccount}
            >
              {deleting ? <CircleNotch className="animate-spin" /> : null}
              Permanently delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
