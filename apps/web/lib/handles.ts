/** X-handle normalization, mirroring the API's normalize_handle: handles
 * are stored and compared in a single "@name" form. */

/** Lowercased name without the "@", for comparisons. */
export function bareHandle(value: string): string {
  return value.replace(/^@+/, "").trim().toLowerCase();
}

/** The stored "@name" form the API writes. */
export function normalizeHandle(value: string): string {
  return `@${value.replace(/^@+/, "").trim()}`;
}
