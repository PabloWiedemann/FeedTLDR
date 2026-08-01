"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
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

  useEffect(() => {
    return watchAuth((u) => {
      setUser(u);
      setLoading(false);
    });
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
