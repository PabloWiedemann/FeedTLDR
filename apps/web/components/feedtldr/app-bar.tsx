"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowsClockwise,
  ChatCircleDots,
  CreditCard,
  GearSix,
  SignOut,
  User,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
 * App header on the shared sticky glass bar: avatar (Google photo or
 * initials) + settings gear left, Re-generate + AI chat right.
 */
export function AppBar({
  email,
  name,
  plan,
  onRegenerate,
  onToggleChat,
  chatOpen,
  regenerateDisabled,
}: {
  email: string;
  name?: string;
  plan?: string;
  onRegenerate: () => void;
  onToggleChat: () => void;
  chatOpen: boolean;
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
    <GlassHeader className="max-w-4xl" bordered={false}>
      <div className="flex items-center gap-2 sm:gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="rounded-full focus-ring"
          >
            <Avatar className="size-10 border border-foreground/25 bg-accent">
              {user?.photoURL && (
                <AvatarImage src={user.photoURL} alt="" referrerPolicy="no-referrer" />
              )}
              <AvatarFallback className="bg-accent text-sm font-medium text-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-60 p-2">
            <DropdownMenuLabel className="flex min-w-0 flex-col gap-2 px-3 py-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate">{name || email}</span>
                {name && (
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {email}
                  </span>
                )}
              </div>
              {plan && (
                <Badge className="py-1">{accountPlanLabel(plan)}</Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="mx-0 my-2" />
            <DropdownMenuItem
              className="px-3 py-2"
              onSelect={() => router.push("/app/settings/profile")}
            >
              <User /> Profile settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="px-3 py-2"
              onSelect={() => router.push("/app/settings/billing")}
            >
              <CreditCard /> Plan &amp; credits
            </DropdownMenuItem>
            <DropdownMenuSeparator className="mx-0 my-2" />
            <DropdownMenuItem
              variant="destructive"
              className="px-3 py-2"
              onSelect={async () => {
                await logout();
                router.push("/");
              }}
            >
              <SignOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="outline" size="icon" className="group">
                <Link href="/app/settings" aria-label="Open settings">
                  <GearSix className="transition-transform duration-300 ease-brand group-hover:rotate-45" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          onClick={onRegenerate}
          disabled={regenerateDisabled}
          aria-label="Re-generate summary"
        >
          <ArrowsClockwise />
          <span className="hidden sm:inline">Re-generate</span>
        </Button>
        <Button
          variant="outline"
          onClick={onToggleChat}
          aria-label={chatOpen ? "Close AI chat" : "Open AI chat"}
          aria-pressed={chatOpen}
        >
          <ChatCircleDots />
          <span className="hidden sm:inline">AI chat</span>
        </Button>
      </div>
    </GlassHeader>
  );
}
