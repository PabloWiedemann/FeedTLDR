"use client";

import { useEffect, useState } from "react";
import { Plus, SealCheck, Warning, X } from "@phosphor-icons/react";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
} from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AccountChip, SuggestionChip } from "./account-chip";
import { ImportAccountsDialog } from "./accounts-field";
import { Notice } from "./notice";
import { Spinner } from "./spinner";
import { useAccounts, useAccountSuggestions } from "@/lib/api/queries";
import {
  useAddAccounts,
  useClearAccounts,
  useRemoveAccount,
  useVerifyAccounts,
} from "@/lib/api/mutations";
import { bareHandle, handleFromInput, normalizeHandle } from "@/lib/handles";
import { cn } from "@/lib/utils";

/** One spring for every chip move: enters, exits, and bucket flights. */
export const CHIP_SPRING = { type: "spring", duration: 0.4, bounce: 0 } as const;

/** A big import lands as one swarm; more flights than this read as noise. */
const MAX_IMPORT_FLIGHTS = 15;

/** How long a launched chip rests at its source before flying. */
const LAUNCH_RELEASE_MS = 80;

/** Gives an import's refetch this long to land before launch chips sweep. */
const IMPORT_SWEEP_MS = 5000;

/** Suggestion chips shown in the methods panel at once. */
const MAX_PANEL_SUGGESTIONS = 10;

/**
 * The bucket visual: a white card with a recessed inner panel and a
 * 45°-bevelled notch cut from the top edge, so it always reads as an open
 * bucket. Purely presentational so the gallery can show any chips.
 */
export function Bucket({
  children,
  footer,
  className,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="bucket-open flex flex-col gap-4 rounded-card border bg-card p-4 pt-6">
        <div className="flex min-h-56 flex-col justify-end rounded-card bg-background p-4">
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}

/** A staged, not-yet-saved handle: dashed like a suggestion, removable. */
export function PendingChip({
  handle,
  onRemove,
}: {
  handle: string;
  onRemove?: (handle: string) => void;
}) {
  return (
    <span
      className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed ps-3 pe-1.5 text-sm font-medium"
      title={`${handle}: not saved yet`}
    >
      {handle}
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(handle)}
          aria-label={`Remove ${handle}`}
          className="press grid size-5 place-items-center rounded-full transition-colors duration-150 outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/45"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

/** Count indicator with an explanatory tooltip (keyboard reachable). */
export function BucketCount({
  icon,
  count,
  tooltip,
  className,
}: {
  icon: React.ReactNode;
  count: number;
  tooltip: string;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={cn(
              "focus-ring inline-flex items-center gap-1 rounded-full text-sm font-medium tabular-nums",
              className
            )}
          >
            {icon}
            {count}
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Chip wrapper: pops in when typed, flies when it has a prior position
 * (same layoutId in the suggestions list), leaves softly. */
export function MotionChip({
  layoutKey,
  children,
}: {
  layoutKey: string;
  children: React.ReactNode;
}) {
  return (
    <motion.span
      layout
      layoutId={layoutKey}
      initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 4 }}
      transition={CHIP_SPRING}
      className="inline-flex"
    >
      {children}
    </motion.span>
  );
}

function MethodLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium">{children}</p>;
}

/**
 * The accounts list as a bucket. Closed, it shows the saved chips, the
 * verified count and one Edit button. Editing opens the bucket and a
 * methods panel (manual, import, suggested) whose chips drop in as staged
 * changes; Save verifies on X, keeps what exists, and flags what does not.
 */
export function AccountsBucket({ className }: { className?: string }) {
  const accounts = useAccounts();
  const suggestionsQuery = useAccountSuggestions();
  const addAccounts = useAddAccounts();
  const removeAccount = useRemoveAccount();
  const clearAccounts = useClearAccounts();
  const verifyAccounts = useVerifyAccounts();

  const [editing, setEditing] = useState(false);
  const [draftInput, setDraftInput] = useState("");
  const [pendingAdds, setPendingAdds] = useState<string[]>([]);
  const [pendingRemovals, setPendingRemovals] = useState<Set<string>>(
    () => new Set()
  );
  // Bare handles the last verification could not find on X.
  const [notFound, setNotFound] = useState<Set<string>>(() => new Set());
  // Launch pads: chips render at their source for one beat, then move into
  // the bucket state, so the shared layoutId flies them across (the same
  // flight the suggestion chips get for free by unmounting).
  const [manualLaunch, setManualLaunch] = useState<string[]>([]);
  const [importLaunch, setImportLaunch] = useState<string[]>([]);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const saved = accounts.data?.accounts ?? [];
  const verified = new Set(accounts.data?.verified_accounts ?? []);
  const maxAccounts = accounts.data?.max_accounts ?? Infinity;

  const shownSaved = saved.filter(
    (handle) => !pendingRemovals.has(bareHandle(handle))
  );
  const verifiedCount = shownSaved.filter((handle) =>
    verified.has(handle)
  ).length;
  const invalid = shownSaved.filter((handle) =>
    notFound.has(bareHandle(handle))
  );
  const draftCount = shownSaved.length + pendingAdds.length;
  const dirty = pendingAdds.length > 0 || pendingRemovals.size > 0;
  const atLimit = draftCount >= maxAccounts;
  const saving =
    addAccounts.isPending ||
    removeAccount.isPending ||
    clearAccounts.isPending ||
    verifyAccounts.isPending;

  const inDraft = new Set([
    ...saved.map(bareHandle),
    ...pendingAdds.map(bareHandle),
    ...manualLaunch.map(bareHandle),
    ...importLaunch.map(bareHandle),
  ]);
  const suggestions = (suggestionsQuery.data?.suggestions ?? [])
    .filter((handle) => !inDraft.has(bareHandle(handle)))
    .slice(0, MAX_PANEL_SUGGESTIONS);

  /** Parse, dedupe and limit raw input into stageable "@name" handles. */
  function prepareHandles(rawValues: string[]): string[] {
    const refused = rawValues.filter((value) => handleFromInput(value) === null);
    if (refused.length > 0) toast.error("This link does not go to a profile.");
    const handles = rawValues
      .map(handleFromInput)
      .filter((value): value is string => value !== null && value.trim() !== "")
      .map(normalizeHandle)
      .filter((handle) => handle !== "@" && !inDraft.has(bareHandle(handle)));
    if (handles.length === 0) return [];
    const room = Math.max(0, maxAccounts - draftCount);
    if (handles.length > room) {
      toast.error(`Your plan allows up to ${maxAccounts} accounts.`);
    }
    return handles.slice(0, room);
  }

  function stageAdds(rawValues: string[]) {
    const handles = prepareHandles(rawValues);
    if (handles.length > 0) {
      setPendingAdds((current) => [...current, ...handles]);
    }
  }

  function commitDraftInput() {
    const values = draftInput.split(/[\s,]+/).filter(Boolean);
    if (values.length > 0) {
      // Onto the launch pad next to the input; the effect below releases
      // them into the bucket a beat later, producing the flight.
      setManualLaunch((current) => [...current, ...prepareHandles(values)]);
    }
    setDraftInput("");
  }

  useEffect(() => {
    if (manualLaunch.length === 0) return;
    const release = window.setTimeout(() => {
      setPendingAdds((current) => {
        const known = new Set(current.map(bareHandle));
        return [
          ...current,
          ...manualLaunch.filter((handle) => !known.has(bareHandle(handle))),
        ];
      });
      setManualLaunch([]);
    }, LAUNCH_RELEASE_MS);
    return () => window.clearTimeout(release);
  }, [manualLaunch]);

  // Imported handles fly out one by one as the refetched list includes
  // them; the timeout sweeps any that never land (e.g. refetch failure).
  const savedBare = new Set(saved.map(bareHandle));
  const importInFlight = importLaunch.filter(
    (handle) => !savedBare.has(bareHandle(handle))
  );
  useEffect(() => {
    if (importLaunch.length === 0) return;
    const sweep = window.setTimeout(() => setImportLaunch([]), IMPORT_SWEEP_MS);
    return () => window.clearTimeout(sweep);
  }, [importLaunch]);

  function removeChip(handle: string) {
    const bare = bareHandle(handle);
    if (pendingAdds.some((added) => bareHandle(added) === bare)) {
      setPendingAdds((current) =>
        current.filter((added) => bareHandle(added) !== bare)
      );
      return;
    }
    setPendingRemovals((current) => new Set(current).add(bare));
  }

  function resetStaging() {
    setPendingAdds([]);
    setPendingRemovals(new Set());
    setConfirmingClear(false);
  }

  /** Verification result decides whether the bucket closes: everything
   * found → close with the mutation's success toast; misses stay flagged
   * red so "Clear invalid accounts" can sweep them. */
  function finishAfterVerify(result: { not_found: string[] }) {
    setNotFound(new Set(result.not_found.map(bareHandle)));
    if (result.not_found.length === 0) setEditing(false);
  }

  async function save() {
    const removals = [...pendingRemovals];
    const adds = [...pendingAdds];
    // Staging stays in place until the writes land, so the bucket never
    // flashes back to the pre-save list mid-flight.
    try {
      if (removals.length > 0) {
        const clearingAll = saved.every((handle) =>
          pendingRemovals.has(bareHandle(handle))
        );
        if (clearingAll) {
          // One atomic write: per-handle removals are read-modify-write on
          // the server, so firing them concurrently loses updates.
          await clearAccounts.mutateAsync();
        } else {
          for (const bare of removals) await removeAccount.mutateAsync(bare);
        }
      }
      if (adds.length > 0) await addAccounts.mutateAsync(adds);
    } catch {
      return; // the mutation's toast already explained; staging kept to retry
    }
    resetStaging();
    const needsVerify =
      adds.length > 0 || shownSaved.some((handle) => !verified.has(handle));
    if (needsVerify) {
      verifyAccounts.mutate(undefined, { onSuccess: finishAfterVerify });
      return;
    }
    toast.success("Accounts saved");
    setEditing(false);
  }

  function clearInvalid() {
    for (const handle of invalid) removeAccount.mutate(bareHandle(handle));
    setNotFound(new Set());
  }

  function stageClearAll() {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    setPendingAdds([]);
    setPendingRemovals(new Set(saved.map(bareHandle)));
    setConfirmingClear(false);
  }

  if (accounts.isLoading) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <Skeleton className="h-72 rounded-card" />
      </div>
    );
  }

  const chipState = (handle: string) =>
    verified.has(handle)
      ? "verified"
      : notFound.has(bareHandle(handle))
        ? "not_found"
        : "unverified";


  /** Chips resting on a launch pad; unmounting them flies them into the
   * bucket via the shared layoutId. */
  const launchRow = (handles: string[]) =>
    handles.length > 0 && (
      <div className="flex flex-wrap gap-2">
        <AnimatePresence initial={false} mode="popLayout">
          {handles.map((handle) => (
            <motion.span
              key={bareHandle(handle)}
              layout
              layoutId={`chip-${bareHandle(handle)}`}
              transition={CHIP_SPRING}
              className="inline-flex"
            >
              <PendingChip handle={handle} />
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    );

  const bucketChips = (
    <AnimatePresence initial={false} mode="popLayout">
      {shownSaved.map((handle) => (
        <MotionChip
          key={bareHandle(handle)}
          layoutKey={`chip-${bareHandle(handle)}`}
        >
          <AccountChip
            handle={handle}
            state={chipState(handle)}
            onRemove={editing ? removeChip : undefined}
          />
        </MotionChip>
      ))}
      {pendingAdds.map((handle) => (
        <MotionChip
          key={bareHandle(handle)}
          layoutKey={`chip-${bareHandle(handle)}`}
        >
          <PendingChip handle={handle} onRemove={removeChip} />
        </MotionChip>
      ))}
    </AnimatePresence>
  );

  const verifiedBadge = (
    <BucketCount
      icon={<SealCheck aria-hidden="true" />}
      count={verifiedCount}
      tooltip={`${verifiedCount} accounts are verified to exist on X`}
    />
  );

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <div className={cn("flex flex-col", className)}>
          {/* The methods sheet lives behind the bucket: it unrolls from
              under the lip (height reveal) and slides back beneath on exit.
              The bucket paints on top (later sibling + filter stacking). */}
          <AnimatePresence initial={false}>
            {editing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={CHIP_SPRING}
                className="-mb-4 overflow-hidden"
              >
                <div className="flex flex-col gap-6 rounded-t-card border bg-background p-5 pb-9 sm:p-6 sm:pb-10">
                <div className="flex flex-col gap-2.5">
                  <MethodLabel>Add accounts manually</MethodLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      value={draftInput}
                      onChange={(event) => setDraftInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitDraftInput();
                        }
                      }}
                      placeholder="Enter an account or paste its profile link"
                      aria-label="Account to add"
                      disabled={atLimit}
                      className="bg-card"
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={commitDraftInput}
                      disabled={atLimit || draftInput.trim() === ""}
                      aria-label="Add the typed account"
                    >
                      <Plus />
                    </Button>
                  </div>
                  {launchRow(manualLaunch)}
                </div>

                <div className="flex flex-col gap-2.5">
                  <MethodLabel>Add everyone that one account follows</MethodLabel>
                  <div>
                    <ImportAccountsDialog
                      onImported={(handles) =>
                        setImportLaunch(
                          handles.slice(0, MAX_IMPORT_FLIGHTS).map(normalizeHandle)
                        )
                      }
                    />
                  </div>
                  {launchRow(importInFlight)}
                </div>

                {suggestions.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <MethodLabel>Suggested for you</MethodLabel>
                    <div className="flex flex-wrap gap-2">
                      <AnimatePresence initial={false} mode="popLayout">
                        {suggestions.map((handle) => (
                          <motion.span
                            key={bareHandle(handle)}
                            layout
                            layoutId={`chip-${bareHandle(handle)}`}
                            transition={CHIP_SPRING}
                            className="inline-flex"
                          >
                            <SuggestionChip
                              handle={handle}
                              onAdd={(value) => stageAdds([value])}
                              disabled={atLimit}
                              className="bg-card"
                            />
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {atLimit && (
                  <Notice tone="warning" className="text-xs">
                    Your plan allows up to {maxAccounts} accounts. Remove some
                    or upgrade to add more.
                  </Notice>
                )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Bucket
            footer={
              editing ? (
                <div className="flex flex-wrap items-center gap-3">
                  {verifiedBadge}
                  {invalid.length > 0 && (
                    <BucketCount
                      icon={<Warning weight="fill" aria-hidden="true" />}
                      count={invalid.length}
                      tooltip={`${invalid.length} accounts were not found on X`}
                    />
                  )}
                  {invalid.length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearInvalid}
                    >
                      Clear invalid accounts
                    </Button>
                  ) : (
                    draftCount > 0 && (
                      <Button
                        type="button"
                        variant={confirmingClear ? "destructive" : "ghost"}
                        size="sm"
                        onClick={stageClearAll}
                        onBlur={() => setConfirmingClear(false)}
                      >
                        {confirmingClear ? "Really clear all?" : "Clear all"}
                      </Button>
                    )
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving}
                      onClick={() => {
                        resetStaging();
                        setEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={save}
                      disabled={saving || (!dirty && invalid.length === 0)}
                    >
                      {saving && <Spinner />}
                      {saving ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {saved.length > 0 ? verifiedBadge : <span />}
                  <Button type="button" onClick={() => setEditing(true)}>
                    {saved.length === 0 ? (
                      <>
                        Add accounts <Plus />
                      </>
                    ) : (
                      "Edit accounts"
                    )}
                  </Button>
                </div>
              )
            }
          >
            {draftCount === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No accounts added yet
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">{bucketChips}</div>
            )}
          </Bucket>
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}
