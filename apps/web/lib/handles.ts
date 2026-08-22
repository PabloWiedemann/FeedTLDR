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

/** X profile URL: optional scheme/subdomain, x.com or twitter.com, then the
 * handle (1-15 word characters), then optionally more path/query. */
const PROFILE_URL =
  /^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})(?:[/?#].*)?$/i;

/** First path segments on x.com that are product pages, not profiles. */
const NON_PROFILE_SEGMENTS = new Set([
  "home",
  "explore",
  "notifications",
  "messages",
  "search",
  "settings",
  "compose",
  "login",
  "logout",
  "signup",
  "i",
  "intent",
  "hashtag",
  "share",
  "about",
  "tos",
  "privacy",
  "download",
]);

/**
 * A typed handle or a pasted profile URL, reduced to the bare handle.
 * Returns null when the input is a URL without a profile in it. Plain
 * non-URL text passes through untouched (the API normalizes it).
 */
export function handleFromInput(value: string): string | null {
  const trimmed = value.trim();
  const match = PROFILE_URL.exec(trimmed);
  if (match) {
    const handle = match[1];
    return NON_PROFILE_SEGMENTS.has(handle.toLowerCase()) ? null : handle;
  }
  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) || /(?:x|twitter)\.com\//i.test(trimmed);
  return looksLikeUrl ? null : trimmed;
}
