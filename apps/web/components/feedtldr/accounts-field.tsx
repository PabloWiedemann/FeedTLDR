"use client";

import { useState } from "react";
import { DownloadSimple, SealCheck } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Notice } from "./notice";
import { Spinner } from "./spinner";
import { TagInput, type TagItem } from "./tag-input";
import { useAccounts } from "@/lib/api/queries";
import {
  useAddAccounts,
  useImportFollowees,
  useRemoveAccount,
  useVerifyAccounts,
} from "@/lib/api/mutations";

/** The accounts a user follows, tagged with whether we found them on X. */
function useAccountTags(enabled: boolean) {
  const accounts = useAccounts(enabled);
  const verified = new Set(accounts.data?.verified_accounts ?? []);
  const items: TagItem[] = (accounts.data?.accounts ?? []).map((handle) => ({
    value: handle,
    state: verified.has(handle) ? "verified" : "unverified",
  }));

  return {
    items,
    maxAccounts: accounts.data?.max_accounts,
    unverifiedCount: items.filter((item) => item.state !== "verified").length,
    atLimit:
      accounts.data !== undefined &&
      accounts.data.accounts.length >= accounts.data.max_accounts,
  };
}

/** Chip input for the X accounts to follow, with the plan limit made visible. */
export function AccountsField({ enabled = true }: { enabled?: boolean }) {
  const { items, maxAccounts, atLimit } = useAccountTags(enabled);
  const addAccounts = useAddAccounts();
  const removeAccount = useRemoveAccount();
  const disabled = addAccounts.isPending || atLimit;

  return (
    <div className="flex flex-col gap-3">
      <TagInput
        items={items}
        onAdd={(values) => addAccounts.mutate(values)}
        onRemove={(value) => removeAccount.mutate(value)}
        disabled={disabled}
      />
      {atLimit && (
        <Notice tone="warning" className="text-xs">
          Your plan allows up to {maxAccounts} accounts. Remove some or upgrade
          to add more.
        </Notice>
      )}
    </div>
  );
}

/** Checks unverified handles against X. Idle once everything is verified. */
export function VerifyAccountsButton({ enabled = true }: { enabled?: boolean }) {
  const { unverifiedCount } = useAccountTags(enabled);
  const verifyAccounts = useVerifyAccounts();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => verifyAccounts.mutate()}
      disabled={verifyAccounts.isPending || unverifiedCount === 0}
    >
      {verifyAccounts.isPending ? <Spinner /> : <SealCheck />}
      Verify accounts
      {unverifiedCount > 0 ? ` (${unverifiedCount})` : ""}
    </Button>
  );
}

/** Bulk-adds every account that one X account follows. */
export function ImportAccountsDialog() {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const importFollowees = useImportFollowees();

  function importAndClose() {
    importFollowees.mutate(source, {
      onSuccess: () => {
        setOpen(false);
        setSource("");
      },
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <DownloadSimple /> Import from an account
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import accounts</DialogTitle>
            <DialogDescription>
              Add every account that a given X account follows. One account at a
              time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="@youraccount"
              aria-label="Account to import followees from"
            />
            <Button
              type="button"
              onClick={importAndClose}
              disabled={importFollowees.isPending || source.trim() === ""}
            >
              {importFollowees.isPending ? (
                <>
                  <Spinner /> Importing…
                </>
              ) : (
                "Import followed accounts"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
