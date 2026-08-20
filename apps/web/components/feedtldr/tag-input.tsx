"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountChip, type AccountState } from "./account-chip";
import { cn } from "@/lib/utils";

export type TagItem = { value: string; state?: AccountState };

/**
 * Chip input for X accounts (mock 3): type a handle, press Enter or the plus
 * button to add. Pasting a comma/space separated list splits it.
 */
export function TagInput({
  items,
  onAdd,
  onRemove,
  placeholder = "Enter an account and press Enter (e.g. @elonmusk)",
  disabled,
  listFooter,
  listClassName,
  className,
}: {
  items: TagItem[];
  onAdd: (values: string[]) => void;
  onRemove: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Actions pinned under the chip list; chips scroll beneath them on glass. */
  listFooter?: React.ReactNode;
  /** Overrides the chip list's max height (defaults to max-h-64). */
  listClassName?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const values = draft
      .split(/[\s,]+/)
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length > 0) onAdd(values);
    setDraft("");
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Add account"
        />
        <Button
          type="button"
          size="icon"
          onClick={commit}
          disabled={disabled || draft.trim() === ""}
          aria-label="Add account to list"
        >
          <Plus />
        </Button>
      </div>
      {(items.length > 0 || listFooter) && (
        <div
          className={
            items.length > 0
              ? cn("max-h-64 overflow-y-auto", listClassName)
              : undefined
          }
        >
          {items.length > 0 && (
            <ul
              className="flex flex-wrap gap-2"
              aria-label="Accounts you follow"
            >
              {items.map((item) => (
                <li key={item.value}>
                  <AccountChip
                    handle={item.value}
                    state={item.state ?? "unverified"}
                    onRemove={disabled ? undefined : onRemove}
                  />
                </li>
              ))}
            </ul>
          )}
          {listFooter && (
            <div className="sticky bottom-0 flex flex-wrap gap-2 bg-card/70 pt-3 backdrop-blur-md">
              {listFooter}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
