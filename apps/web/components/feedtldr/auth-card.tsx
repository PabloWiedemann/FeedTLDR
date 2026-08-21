"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Logo } from "./logo";

/** Shared shell for login/signup: centered card on cream with Google option. */
export function AuthCard({
  title,
  children,
  onGoogle,
  googleLabel,
  googleDisabled = false,
  googleBusy = false,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  onGoogle: () => void;
  googleLabel: string;
  googleDisabled?: boolean;
  googleBusy?: boolean;
  footer: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {children}
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onGoogle}
            disabled={googleDisabled}
          >
            {/* Google's brand G keeps its official colors (branding guide);
                the button itself stays in our outline style. */}
            <Image
              src="/brand/google-logo.svg"
              alt=""
              width={16}
              height={16}
              className={googleBusy ? "animate-pulse" : undefined}
            />{" "}
            {googleBusy ? "Connecting…" : googleLabel}
          </Button>
        </CardContent>
      </Card>
      <div className="text-sm text-muted-foreground">{footer}</div>
    </main>
  );
}
