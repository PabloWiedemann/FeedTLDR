"use client";

import { useState } from "react";

/**
 * Editable local state seeded from server data, re-seeded whenever that data
 * is replaced. Uses React's adjust-state-during-render pattern rather than an
 * effect, so the first paint already shows the loaded value.
 *
 *   const [email, setEmail] = useSyncedState(settings.data, (s) => s.newsletter_email ?? "");
 */
export function useSyncedState<TSource, TValue>(
  source: TSource | undefined,
  derive: (source: TSource) => TValue,
  initial: TValue
): [TValue, (value: TValue) => void] {
  const [value, setValue] = useState<TValue>(initial);
  const [syncedFrom, setSyncedFrom] = useState<TSource | undefined>(undefined);

  if (source !== undefined && source !== syncedFrom) {
    setSyncedFrom(source);
    setValue(derive(source));
  }

  return [value, setValue];
}
