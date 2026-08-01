"use client";

import { useRouter } from "next/navigation";
import { ArrowsClockwise, Faders, SignOut, User } from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/firebase";

/**
 * App header (mock 2): settings icon-button left; Re-generate + avatar right.
 */
export function AppBar({
  email,
  name,
  onOpenSettings,
  onRegenerate,
  regenerateDisabled,
}: {
  email: string;
  name?: string;
  onOpenSettings: () => void;
  onRegenerate: () => void;
  regenerateDisabled?: boolean;
}) {
  const router = useRouter();
  const initials =
    (name || email)
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <header className="mx-auto flex h-18 w-full max-w-3xl items-center justify-between px-6">
      <Button
        variant="outline"
        size="icon"
        onClick={onOpenSettings}
        aria-label="Open settings"
      >
        <Faders />
      </Button>
      <div className="flex items-center gap-3">
        <Button onClick={onRegenerate} disabled={regenerateDisabled}>
          <ArrowsClockwise /> Re-generate
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
          >
            <Avatar className="size-10 bg-accent">
              <AvatarFallback className="bg-accent text-sm font-medium text-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuLabel className="truncate">
              {name || email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/profile")}>
              <User /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/pricing")}>
              Plan &amp; credits
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={async () => {
                await logout();
                router.push("/");
              }}
            >
              <SignOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
