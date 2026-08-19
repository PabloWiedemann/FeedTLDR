"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Signed-in visitors jump to their summary; everyone else logs in. */
export function NavAuthButton() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Skeleton className="h-10 w-24 rounded-full" />;
  }

  return user ? (
    <Button asChild className="group">
      <Link href="/app">
        Your summary{" "}
        <ArrowRight className="transition-transform duration-200 ease-brand group-hover:translate-x-0.5" />
      </Link>
    </Button>
  ) : (
    <Button asChild>
      <Link href="/login">Log in</Link>
    </Button>
  );
}
