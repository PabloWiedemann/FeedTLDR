"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Settings navigation: a flat full-height panel on desktop (group titles
 * between the two kinds of settings), a scrollable pill strip on mobile.
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
  className,
}: {
  href: string;
  label: string;
  active: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring rounded-full px-4 py-2.5 font-medium whitespace-nowrap transition-colors duration-150 ease-brand",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        className
      )}
    >
      {label}
    </Link>
  );
}

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: flat panel spanning the viewport height. */}
      <nav
        aria-label="Settings"
        className="sticky top-2 hidden h-[calc(100dvh-1rem)] w-72 shrink-0 flex-col gap-10 overflow-y-auto rounded-card border bg-card p-6 lg:flex"
      >
        <h2 className="px-4 pt-4 text-title">Settings</h2>
        <div className="flex flex-col gap-10">
          {GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <p className="px-4 pb-1 text-sm font-medium text-muted-foreground">
                {group.title}
              </p>
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={pathname === item.href}
                />
              ))}
            </div>
          ))}
        </div>
      </nav>

      {/* Mobile: horizontal pill strip. */}
      <nav aria-label="Settings" className="flex lg:hidden">
        <div className="flex w-full gap-2 overflow-x-auto pb-1">
          {GROUPS.flatMap((group) => group.items).map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              active={pathname === item.href}
              className={cn(
                "text-sm",
                pathname !== item.href && "bg-card"
              )}
            />
          ))}
        </div>
      </nav>
    </>
  );
}
