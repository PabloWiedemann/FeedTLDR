"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Settings navigation: a flat full-height panel on desktop (small muted
 * group labels over ink-colored pill items, so labels read as headings
 * and items read as clickable), a scrollable pill strip on mobile.
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
        "focus-ring rounded-full px-4 py-2.5 font-medium whitespace-nowrap text-foreground transition-colors duration-150 ease-brand",
        active ? "bg-secondary" : "hover:bg-accent",
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
      {/* Desktop: flat panel filling the height under the back link. */}
      <nav
        aria-label="Settings"
        className="hidden min-h-0 flex-1 flex-col gap-8 overflow-y-auto rounded-card border bg-card p-5 lg:flex"
      >
        <h2 className="px-4 pt-2 text-title">Settings</h2>
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
              className={cn("text-sm", pathname !== item.href && "bg-card")}
            />
          ))}
        </div>
      </nav>
    </>
  );
}
