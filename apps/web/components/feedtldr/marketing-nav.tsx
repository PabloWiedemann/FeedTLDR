import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";

/** Marketing header (mock 1): logo left, Pricing + outline CTA right, ≤72px. */
export function MarketingNav() {
  return (
    <header className="mx-auto flex h-18 w-full max-w-6xl items-center justify-between px-6">
      <Logo />
      <nav aria-label="Main" className="flex items-center gap-6">
        <Link
          href="/pricing"
          className="rounded-full text-sm font-medium outline-none transition-colors duration-150 hover:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/45"
        >
          Pricing
        </Link>
        <Button asChild variant="outline">
          <Link href="/app">
            Go to summary <ArrowRight />
          </Link>
        </Button>
      </nav>
    </header>
  );
}
