"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { List } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Settings navigation: a flat full-height panel on desktop (small muted
 * group labels over ink-colored pill items, so labels read as headings
 * and items read as clickable). On mobile it collapses into a round
 * icon button that opens a near-full-width left drawer; picking a page
 * navigates and closes the drawer.
 */

const GROUPS = [
  {
    title: "Your account",
    items: [
      { href: "/app/settings/profile", label: "Profile" },
      { href: "/app/settings/billing", label: "Billing" },
    ],
  },
  {
    title: "Your summary",
    items: [
      { href: "/app/settings/accounts", label: "Accounts" },
      { href: "/app/settings/prompt", label: "AI prompt" },
      { href: "/app/settings/email", label: "Daily email" },
    ],
  },
];

function NavItem({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring rounded-full px-4 py-2.5 font-medium whitespace-nowrap text-foreground transition-colors duration-150 ease-brand",
        active ? "bg-secondary" : "hover:bg-accent"
      )}
    >
      {label}
    </Link>
  );
}

function NavGroups({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-8">
      {GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-1.5">
          <p className="px-4 pb-1 text-xs font-semibold tracking-wide text-muted-foreground">
            {group.title}
          </p>
          {group.items.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              active={pathname === item.href}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SettingsNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Desktop: flat panel filling the height under the back link. */}
      <nav
        aria-label="Settings"
        className="hidden min-h-0 flex-1 flex-col gap-8 overflow-y-auto rounded-card border bg-card p-5 md:flex"
      >
        <h2 className="px-4 pt-2 text-title">Settings</h2>
        <NavGroups />
      </nav>

      {/* Mobile: a round icon button that opens the nav drawer. */}
      <Button
        variant="outline"
        size="icon"
        className="md:hidden"
        onClick={() => setDrawerOpen(true)}
      >
        <List />
        <span className="sr-only">Open settings menu</span>
      </Button>
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-5/6 gap-8 overflow-y-auto bg-card p-5"
        >
          <SheetTitle className="px-4 pt-2 text-title">Settings</SheetTitle>
          <nav aria-label="Settings">
            <NavGroups onNavigate={() => setDrawerOpen(false)} />
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
