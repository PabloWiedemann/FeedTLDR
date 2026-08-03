import createClient from "openapi-fetch";
import type { paths } from "./schema";
import { getFirebaseAppCheckToken, getIdToken } from "@/lib/firebase";

/**
 * Typed API client generated from apps/api/openapi.json (run `pnpm gen:api`
 * after any API change). Attaches the Firebase ID token to every request.
 */
export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
});

api.use({
  async onRequest({ request }) {
    const token = await getIdToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    const appCheckToken = await getFirebaseAppCheckToken();
    if (appCheckToken) {
      request.headers.set("X-Firebase-AppCheck", appCheckToken);
    }
    return request;
  },
});

/** Throw on API-level errors so TanStack Query can surface them. */
export function unwrap<T>(result: { data?: T; error?: unknown }): T {
  if (result.error !== undefined) {
    const detail =
      typeof result.error === "object" && result.error !== null && "detail" in result.error
        ? String((result.error as { detail: unknown }).detail)
        : "Request failed";
    throw new Error(detail);
  }
  return result.data as T;
}
