"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Toaster } from "@/components/ui/sonner";
import { identifyUser, resetAnalytics } from "@/lib/analytics";
import { watchAuth, type User } from "@/lib/firebase";

// ---------- auth ----------

type AuthState = {
  user: User | null;
  /** true until Firebase resolves the initial session */
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

// ---------- providers ----------

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
        },
      })
  );

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const prevUid = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    return watchAuth((u) => {
      // A different user (or a sign-out) invalidates every cached response:
      // without this, the previous account's profile/feed keeps rendering.
      const uid = u?.uid ?? null;
      if (prevUid.current !== undefined && prevUid.current !== uid) {
        queryClient.clear();
      }
      if (u) {
        identifyUser(u.uid, { email: u.email, name: u.displayName });
      } else if (prevUid.current) {
        // Only on a real sign-out; resetting an anonymous visitor would
        // mint a fresh ID on every page load and break attribution.
        resetAnalytics();
      }
      prevUid.current = uid;
      setUser(u);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authValue = useMemo(() => ({ user, loading }), [user, loading]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        {children}
        <Toaster position="bottom-center" theme="light" />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
