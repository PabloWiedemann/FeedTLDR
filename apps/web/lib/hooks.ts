"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type Me = components["schemas"]["MeResponse"];
export type Feed = components["schemas"]["FeedResponse"];
export type GlobalSettings = components["schemas"]["GlobalSettings"];
export type Accounts = components["schemas"]["AccountsResponse"];
export type GenerationStatus = components["schemas"]["GenerationStatus"];
export type GenerationCost = components["schemas"]["GenerationCostResponse"];
export type SourceData = components["schemas"]["SourceDataResponse"];
export type PlansResponse = components["schemas"]["PlansResponse"];
export type BillingUsage = components["schemas"]["BillingUsageResponse"];
export type ChatMessage = components["schemas"]["ChatMessage"];

// ---------- queries ----------

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["me"],
    enabled,
    queryFn: async () => unwrap<Me>(await api.GET("/v1/me")),
  });
}

export function useFeed(enabled = true) {
  return useQuery({
    queryKey: ["feed"],
    enabled,
    queryFn: async () => unwrap<Feed>(await api.GET("/v1/feed")),
  });
}

export function useSettings(enabled = true) {
  return useQuery({
    queryKey: ["settings"],
    enabled,
    queryFn: async () => unwrap<GlobalSettings>(await api.GET("/v1/settings")),
  });
}

export function useAccounts(enabled = true) {
  return useQuery({
    queryKey: ["accounts"],
    enabled,
    queryFn: async () =>
      unwrap<Accounts>(await api.GET("/v1/settings/accounts")),
  });
}

export function useSourceData(enabled = true) {
  return useQuery({
    queryKey: ["source-data"],
    enabled,
    retry: false,
    queryFn: async () =>
      unwrap<SourceData>(await api.GET("/v1/feed/source-data")),
  });
}

/**
 * Polls pipeline_status while a generation is running (the legacy seam).
 * The interval derives from the status itself: it polls every 6s whenever the
 * pipeline reports in_progress and goes quiet otherwise.
 */
export function useGenerationStatus() {
  return useQuery({
    queryKey: ["generation-status"],
    queryFn: async () =>
      unwrap<GenerationStatus>(await api.GET("/v1/generations/status")),
    refetchInterval: (query) =>
      query.state.data?.status === "in_progress" ? 6000 : false,
  });
}

export function useGenerationCost(fetchLatest: boolean, enabled = true) {
  return useQuery({
    queryKey: ["generation-cost", fetchLatest],
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
    queryKey: ["plans"],
    queryFn: async () => unwrap<PlansResponse>(await api.GET("/v1/billing/plans")),
  });
}

export function useBillingUsage(enabled = true) {
  return useQuery({
    queryKey: ["billing-usage"],
    enabled,
    queryFn: async () =>
      unwrap<BillingUsage>(await api.GET("/v1/billing/usage")),
  });
}

// ---------- mutations ----------

export function useStartGeneration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      fetch_latest: boolean;
      prompt?: string | null;
    }) =>
      unwrap(
        await api.POST("/v1/generations", {
          body: { skip_audio: false, skip_email: false, ...body },
        })
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["generation-status"] });
    },
    onError: (e: Error) => {
      const messages: Record<string, string> = {
        generation_in_progress: "A generation is already running.",
        no_accounts: "Add accounts in settings before generating.",
        no_verified_accounts:
          "Verify at least one account in settings before generating.",
        insufficient_credits:
          "Not enough credits. Upgrade your plan or buy more credits.",
      };
      toast.error(messages[e.message] ?? e.message);
    },
  });
}

export function useAddAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (handles: string[]) =>
      unwrap(
        await api.POST("/v1/settings/accounts", { body: { handles } })
      ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["accounts"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (handle: string) =>
      unwrap(
        await api.DELETE("/v1/settings/accounts/{handle}", {
          params: { path: { handle: handle.replace(/^@/, "") } },
        })
      ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["accounts"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useVerifyAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      unwrap<components["schemas"]["VerifyAccountsResponse"]>(
        await api.POST("/v1/settings/accounts/verify")
      ),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["accounts"] });
      if (data.not_found.length > 0) {
        toast.warning(
          `Not found on X: ${data.not_found.join(", ")}`
        );
      } else {
        toast.success("All accounts verified");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useImportFollowees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (source: string) =>
      unwrap<components["schemas"]["ImportAccountsResponse"]>(
        await api.POST("/v1/settings/accounts/import", { body: { source } })
      ),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success(`Imported ${data.imported.length} accounts`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      timezone?: string | null;
      ai_prompt?: string | null;
      newsletter_email?: string | null;
    }) => unwrap(await api.PUT("/v1/settings", { body })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name?: string | null;
      timezone?: string | null;
      tos_accepted?: boolean | null;
      onboarded?: boolean | null;
      onboarding_step?: number | null;
    }) => unwrap(await api.PATCH("/v1/me", { body })),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["me"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (messages: ChatMessage[]) =>
      unwrap<components["schemas"]["ChatResponse"]>(
        await api.POST("/v1/chat", { body: { messages } })
      ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["me"] }),
    onError: (e: Error) => {
      toast.error(
        e.message === "insufficient_credits"
          ? "Not enough credits for another chat message."
          : e.message
      );
    },
  });
}
