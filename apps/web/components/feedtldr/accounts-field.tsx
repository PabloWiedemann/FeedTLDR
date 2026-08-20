"use client";

import { useState } from "react";
import { DownloadSimple, SealCheck, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Notice } from "./notice";
import { Spinner } from "./spinner";
import { TagInput, type TagItem } from "./tag-input";
import { useAccounts } from "@/lib/api/queries";
import { cn } from "@/lib/utils";
import {
  useAddAccounts,
  useClearAccounts,
  useImportFollowees,
  useRemoveAccount,
  useVerifyAccounts,
} from "@/lib/api/mutations";

/** The accounts a user follows, tagged with whether we found them on X. */
export function useAccountTags(enabled: boolean) {
  const accounts = useAccounts(enabled);
  const verified = new Set(accounts.data?.verified_accounts ?? []);
  const items: TagItem[] = (accounts.data?.accounts ?? []).map((handle) => ({
    value: handle,
    state: verified.has(handle) ? "verified" : "unverified",
  }));

  return {
    isLoading: accounts.isLoading,
    items,
    maxAccounts: accounts.data?.max_accounts,
    unverifiedCount: items.filter((item) => item.state !== "verified").length,
    atLimit:
      accounts.data !== undefined &&
      accounts.data.accounts.length >= accounts.data.max_accounts,
  };
}

/** Clears the whole list; asks once inline before it deletes anything. */
function ClearAccountsButton({ count }: { count: number }) {
  const clearAccounts = useClearAccounts();
  const [confirming, setConfirming] = useState(false);

  if (count === 0) return null;

  return (
    <Button
      type="button"
      variant={confirming ? "destructive" : "outline"}
      size="sm"
      onClick={() => {
        if (!confirming) {
          setConfirming(true);
          return;
        }
        clearAccounts.mutate();
        setConfirming(false);
      }}
      onBlur={() => setConfirming(false)}
      disabled={clearAccounts.isPending}
    >
      {clearAccounts.isPending ? <Spinner /> : <Trash />}
      {confirming ? `Really clear ${count} accounts?` : "Clear list"}
    </Button>
  );
}

/** Chip input for the X accounts to follow, with the plan limit made visible. */
export function AccountsField({
  enabled = true,
  withActions = false,
  withVerify = true,
  listClassName,
  className,
}: {
  enabled?: boolean;
  /** Pin verify/import/clear actions under the chip list (settings). */
  withActions?: boolean;
  /** Drop the verify action when verification lives elsewhere (onboarding). */
  withVerify?: boolean;
  /** Overrides the chip list's max height (see TagInput). */
  listClassName?: string;
  className?: string;
}) {
  const { isLoading, items, maxAccounts, atLimit } = useAccountTags(enabled);
  const addAccounts = useAddAccounts();
  const removeAccount = useRemoveAccount();
  const disabled = addAccounts.isPending || atLimit;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-11 flex-1 rounded-field" />
          <Skeleton className="size-10 shrink-0 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    // min-h-0 lets a height-capped parent (onboarding card) shrink the chip
    // list into its own scroll instead of overflowing the card.
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <TagInput
        items={items}
        onAdd={(values) => addAccounts.mutate(values)}
        onRemove={(value) => removeAccount.mutate(value)}
        disabled={disabled}
        className="min-h-0 flex-1"
        listClassName={listClassName}
        listFooter={
          withActions ? (
            <>
              {withVerify && <VerifyAccountsButton enabled={enabled} />}
              <ImportAccountsDialog />
              <ClearAccountsButton count={items.length} />
            </>
          ) : undefined
        }
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

/** Checks unverified handles against X. Gone once everything is verified. */
export function VerifyAccountsButton({ enabled = true }: { enabled?: boolean }) {
  const { unverifiedCount } = useAccountTags(enabled);
  const verifyAccounts = useVerifyAccounts();

  if (unverifiedCount === 0 && !verifyAccounts.isPending) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => verifyAccounts.mutate()}
      disabled={verifyAccounts.isPending}
    >
      {verifyAccounts.isPending ? <Spinner /> : <SealCheck />}
      Verify accounts ({unverifiedCount})
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
            <DialogTitle>Import the accounts someone follows</DialogTitle>
            <DialogDescription>
              Type one X account, for example your own. We find the accounts
              that it follows and add them to your list. Your daily summary
              comes from the posts of the accounts on your list.
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
