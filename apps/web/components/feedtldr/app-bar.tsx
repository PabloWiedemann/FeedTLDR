"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowsClockwise,
  ChatCircleDots,
  CreditCard,
  Faders,
  SignOut,
  User,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers";
import { logout } from "@/lib/firebase";
import { accountPlanLabel } from "@/lib/plans";
import { GlassHeader } from "./glass-header";

/**
 * App header: settings icon-button left; Re-generate + AI chat + avatar
 * right, on the shared sticky glass bar. The avatar shows the Google
 * profile photo when the account has one, otherwise initials.
 */
export function AppBar({
  email,
  name,
  plan,
  onOpenSettings,
  onRegenerate,
  regenerateDisabled,
}: {
  email: string;
  name?: string;
  plan?: string;
  onOpenSettings: () => void;
  onRegenerate: () => void;
  regenerateDisabled?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const initials =
    (name || email)
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <GlassHeader className="max-w-4xl">
      <Button
        variant="outline"
        size="icon"
        onClick={onOpenSettings}
        aria-label="Open settings"
      >
        <Faders />
      </Button>
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          onClick={onRegenerate}
          disabled={regenerateDisabled}
          aria-label="Re-generate summary"
        >
          <ArrowsClockwise />
          <span className="hidden sm:inline">Re-generate</span>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/chat" aria-label="Open AI chat">
            <ChatCircleDots />
            <span className="hidden sm:inline">AI chat</span>
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="rounded-full focus-ring"
          >
            <Avatar className="size-10 bg-accent">
              {user?.photoURL && (
                <AvatarImage src={user.photoURL} alt="" referrerPolicy="no-referrer" />
              )}
              <AvatarFallback className="bg-accent text-sm font-medium text-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuLabel className="flex min-w-0 flex-col gap-1">
              <span className="truncate">{name || email}</span>
              {plan && (
                <span className="text-xs font-normal text-muted-foreground">
                  {accountPlanLabel(plan)}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/profile")}>
              <User /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/pricing")}>
              <CreditCard /> Plan &amp; credits
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
    </GlassHeader>
  );
}
