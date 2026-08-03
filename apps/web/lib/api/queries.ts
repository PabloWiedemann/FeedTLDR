"use client";

import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "./client";
import { queryKeys } from "./query-keys";
import type {
  Accounts,
  BillingUsage,
  Feed,
  GenerationCost,
  GenerationStatus,
  GlobalSettings,
  Me,
  PlansResponse,
  SourceData,
} from "./types";

/** How often the UI asks the pipeline how far along it is (DESIGN.md §9). */
const GENERATION_POLL_INTERVAL_MS = 6_000;

export function useMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me,
    enabled,
    queryFn: async () => unwrap<Me>(await api.GET("/v1/me")),
  });
}

export function useFeed(enabled = true) {
  return useQuery({
    queryKey: queryKeys.feed,
    enabled,
    queryFn: async () => unwrap<Feed>(await api.GET("/v1/feed")),
  });
}

export function useSettings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.settings,
    enabled,
    queryFn: async () => unwrap<GlobalSettings>(await api.GET("/v1/settings")),
  });
}

export function useAccounts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.accounts,
    enabled,
    queryFn: async () =>
      unwrap<Accounts>(await api.GET("/v1/settings/accounts")),
  });
}

export function useSourceData(enabled = true) {
  return useQuery({
    queryKey: queryKeys.sourceData,
    enabled,
    retry: false,
    queryFn: async () =>
      unwrap<SourceData>(await api.GET("/v1/feed/source-data")),
  });
}

/**
 * Polls pipeline_status while a generation is running (the legacy seam).
 * The interval derives from the status itself: it polls whenever the pipeline
 * reports in_progress and goes quiet otherwise.
 */
export function useGenerationStatus() {
  return useQuery({
    queryKey: queryKeys.generationStatus,
    queryFn: async () =>
      unwrap<GenerationStatus>(await api.GET("/v1/generations/status")),
    refetchInterval: (query) =>
      query.state.data?.status === "in_progress"
        ? GENERATION_POLL_INTERVAL_MS
        : false,
  });
}

export function useGenerationCost(fetchLatest: boolean, enabled = true) {
  return useQuery({
    queryKey: queryKeys.generationCost(fetchLatest),
    enabled,
    queryFn: async () =>
      unwrap<GenerationCost>(
        await api.GET("/v1/generations/cost", {
          params: { query: { fetch_latest: fetchLatest } },
        })
      ),
  });
}

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans,
    queryFn: async () =>
      unwrap<PlansResponse>(await api.GET("/v1/billing/plans")),
  });
}

export function useBillingUsage(enabled = true) {
  return useQuery({
    queryKey: queryKeys.billingUsage,
    enabled,
    queryFn: async () =>
      unwrap<BillingUsage>(await api.GET("/v1/billing/usage")),
  });
}
