/** Timezone options for the settings sheet, and the fallback the API uses. */

export const DEFAULT_TIMEZONE = "America/New_York";

export const TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

/** "America/New_York" reads better as "America/New York" in a menu. */
export function timezoneLabel(timezone: string): string {
  return timezone.replaceAll("_", " ");
}
