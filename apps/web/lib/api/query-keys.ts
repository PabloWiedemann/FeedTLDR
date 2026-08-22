/**
 * Every TanStack Query key in the app. Keeping them here means an
 * invalidation and the query it invalidates can never drift apart.
 */
export const queryKeys = {
  me: ["me"],
  feed: ["feed"],
  settings: ["settings"],
  accounts: ["accounts"],
  accountSuggestions: ["account-suggestions"],
  sourceData: ["source-data"],
  generationStatus: ["generation-status"],
  generationCost: (fetchLatest: boolean) => ["generation-cost", fetchLatest],
  plans: ["plans"],
  billingUsage: ["billing-usage"],
} as const;

/** Everything a finished generation can change. */
export const generationResultKeys = [
  queryKeys.feed,
  queryKeys.me,
  queryKeys.sourceData,
];
