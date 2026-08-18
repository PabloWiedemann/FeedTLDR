import Link from "next/link";
import { Logo } from "./logo";
import { NavAuthButton } from "./landing/nav-auth-button";

/**
 * Marketing header: logo left, Pricing + auth-aware action right.
 * Sticky glass bar (DESIGN.md §5): translucent canvas with blur and
 * a hairline edge, so content scrolls beneath it.
 */
export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/70 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-18 w-full max-w-5xl items-center justify-between px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="rounded-full text-sm font-medium outline-none transition-colors duration-150 hover:text-muted-foreground focus-ring"
          >
            Pricing
          </Link>
          <NavAuthButton />
        </nav>
      </div>
    </header>
  );
}
