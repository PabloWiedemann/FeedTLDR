"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

/** Landing signup CTA; records which placement converted. */
export function CtaLink({
  location,
  children,
}: {
  location: "hero" | "closing";
  children: React.ReactNode;
}) {
  return (
    <Button asChild size="lg" className="group hover:-translate-y-0.5">
      <Link href="/signup" onClick={() => track("cta_clicked", { location })}>
        {children}
        <ArrowRight className="transition-transform duration-200 ease-brand group-hover:translate-x-0.5" />
      </Link>
    </Button>
  );
}
