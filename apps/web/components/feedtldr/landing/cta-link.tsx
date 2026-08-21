"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers";
import { track } from "@/lib/analytics";

/** Landing CTA; records which placement converted. Signed-in visitors jump
 * straight to their feed, everyone else starts at login (which also offers
 * account creation). */
export function CtaLink({
  location,
  children,
}: {
  location: "hero" | "closing";
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  return (
    <Button asChild size="lg" className="group hover:-translate-y-0.5">
      <Link
        href={user ? "/app" : "/login"}
        onClick={() => track("cta_clicked", { location })}
      >
        {children}
        <ArrowRight className="transition-transform duration-200 ease-brand group-hover:translate-x-0.5" />
      </Link>
    </Button>
  );
}
