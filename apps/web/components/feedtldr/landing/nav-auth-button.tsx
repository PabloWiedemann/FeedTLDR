"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";

/** Signed-in visitors jump to their brief; everyone else logs in. */
export function NavAuthButton() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Button variant="tonal" className="invisible" aria-hidden="true">
        Log in
      </Button>
    );
  }

  return user ? (
    <Button asChild variant="tonal" className="group">
      <Link href="/app">
        Your brief{" "}
        <ArrowRight className="transition-transform duration-200 ease-brand group-hover:translate-x-0.5" />
      </Link>
    </Button>
  ) : (
    <Button asChild variant="tonal">
      <Link href="/login">Log in</Link>
    </Button>
  );
}
