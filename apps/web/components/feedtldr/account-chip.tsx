"use client";

import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type AccountState = "verified" | "unverified" | "not_found";

const stateStyles: Record<AccountState, string> = {
  verified: "bg-pastel-green text-pastel-green-foreground",
  unverified: "bg-pastel-yellow text-pastel-yellow-foreground",
  not_found: "bg-pastel-red text-pastel-red-foreground",
};

const stateLabel: Record<AccountState, string> = {
  verified: "verified",
  unverified: "not verified yet",
  not_found: "account not found",
};

/** Removable X-account chip with verification state (settings sheet, mock 3). */
export function AccountChip({
  handle,
  state = "unverified",
  onRemove,
}: {
  handle: string;
  state?: AccountState;
  onRemove?: (handle: string) => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full ps-3 pe-1.5 text-sm font-medium",
        stateStyles[state]
      )}
      title={`${handle}: ${stateLabel[state]}`}
    >
      {handle}
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(handle)}
          aria-label={`Remove ${handle}`}
          className="grid size-5 place-items-center rounded-full transition-colors duration-150 outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/45 active:scale-[0.96]"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
