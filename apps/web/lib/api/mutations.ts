"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, unwrap } from "./client";
import { queryKeys } from "./query-keys";
import type {
  ChatMessage,
  ChatResponse,
  ImportAccounts,
  VerifyAccounts,
} from "./types";

/**
 * Error codes the API returns for expected, user-fixable failures, mapped to
 * the sentence we show. Anything unmapped surfaces its own message.
 */
const ERROR_MESSAGES: Record<string, string> = {
  generation_in_progress: "A generation is already running.",
  no_accounts: "Add accounts in settings before generating.",
  no_verified_accounts:
    "Verify at least one account in settings before generating.",
  insufficient_credits:
    "Not enough credits. Upgrade your plan or buy more credits.",
};

export function errorMessage(error: Error): string {
  return ERROR_MESSAGES[error.message] ?? error.message;
}

function toastError(error: Error) {
  toast.error(errorMessage(error));
}

/** Invalidate a set of query keys; the shared tail of every mutation here. */
function useInvalidator() {
  const queryClient = useQueryClient();
  return (keys: readonly (readonly unknown[])[]) => {
    for (const queryKey of keys) {
      void queryClient.invalidateQueries({ queryKey });
    }
  };
}

export function useStartGeneration() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: async (body: { fetch_latest: boolean; prompt?: string | null }) =>
      unwrap(
        await api.POST("/v1/generations", {
          body: { skip_audio: false, skip_email: false, ...body },
        })
      ),
    onSuccess: () => invalidate([queryKeys.generationStatus]),
    onError: toastError,
  });
}

export function useAddAccounts() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: async (handles: string[]) =>
      unwrap(await api.POST("/v1/settings/accounts", { body: { handles } })),
    onSuccess: () => invalidate([queryKeys.accounts]),
    onError: toastError,
  });
}

export function useRemoveAccount() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: async (handle: string) =>
      unwrap(
        await api.DELETE("/v1/settings/accounts/{handle}", {
          params: { path: { handle: handle.replace(/^@/, "") } },
        })
      ),
    onSuccess: () => invalidate([queryKeys.accounts]),
    onError: toastError,
  });
}

export function useVerifyAccounts() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: async () =>
      unwrap<VerifyAccounts>(await api.POST("/v1/settings/accounts/verify")),
    onSuccess: (data) => {
      invalidate([queryKeys.accounts]);
      if (data.not_found.length > 0) {
        toast.warning(`Not found on X: ${data.not_found.join(", ")}`);
      } else {
        toast.success("All accounts verified");
      }
    },
    onError: toastError,
  });
}

export function useImportFollowees() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: async (source: string) =>
      unwrap<ImportAccounts>(
        await api.POST("/v1/settings/accounts/import", { body: { source } })
      ),
    onSuccess: (data) => {
      invalidate([queryKeys.accounts]);
      toast.success(`Imported ${data.imported.length} accounts`);
    },
    onError: toastError,
  });
}

export function useUpdateSettings() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: async (body: {
      timezone?: string | null;
      ai_prompt?: string | null;
      newsletter_email?: string | null;
    }) => unwrap(await api.PUT("/v1/settings", { body })),
    onSuccess: () => {
      invalidate([queryKeys.settings]);
      toast.success("Settings saved");
    },
    onError: toastError,
  });
}

export function useUpdateMe() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: async (body: {
      name?: string | null;
      timezone?: string | null;
      tos_accepted?: boolean | null;
      onboarded?: boolean | null;
      onboarding_step?: number | null;
    }) => unwrap(await api.PATCH("/v1/me", { body })),
    onSuccess: () => invalidate([queryKeys.me]),
    onError: toastError,
  });
}

export function useChat() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: async (messages: ChatMessage[]) =>
      unwrap<ChatResponse>(await api.POST("/v1/chat", { body: { messages } })),
    onSuccess: () => invalidate([queryKeys.me]),
    onError: toastError,
  });
}

// ---------- billing ----------

/**
 * Stripe hands back a hosted URL; both checkout and the customer portal work
 * by leaving the app for it, so the mutation owns the navigation.
 */
function useStripeRedirect<TVariables>(
  request: (variables: TVariables) => Promise<{ url: string }>,
  failureMessage: string
) {
  return useMutation({
    mutationFn: request,
    onSuccess: ({ url }) => window.location.assign(url),
    onError: () => toast.error(failureMessage),
  });
}

export function useCheckout() {
  return useStripeRedirect(
    async (priceId: string) =>
      unwrap<{ url: string }>(
        await api.POST("/v1/billing/checkout", { body: { price_id: priceId } })
      ),
    "Could not start checkout. Try again."
  );
}

export function useBillingPortal() {
  return useStripeRedirect<void>(
    async () => unwrap<{ url: string }>(await api.POST("/v1/billing/portal")),
    "Could not open the billing portal."
  );
}

export function useDeleteAccount() {
  return useMutation<unknown, Error, void>({
    mutationFn: async () => unwrap(await api.DELETE("/v1/me")),
    onError: () => toast.error("Could not delete the account. Contact support."),
  });
}
