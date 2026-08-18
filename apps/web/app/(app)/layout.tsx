"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers";

/** Auth-gated section: redirects logged-out visitors to /login. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16">
        <Skeleton className="h-10 w-40 rounded-full" />
        <Skeleton className="h-14 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-40 w-full rounded-card" />
      </div>
    );
  }

  return <>{children}</>;
}
