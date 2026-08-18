import Link from "next/link";
import { GlassHeader } from "./glass-header";
import { Logo } from "./logo";
import { NavAuthButton } from "./landing/nav-auth-button";

/** Marketing header: logo left, Pricing + auth-aware action right. */
export function MarketingNav() {
  return (
    <GlassHeader className="max-w-5xl">
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
    </GlassHeader>
  );
}
