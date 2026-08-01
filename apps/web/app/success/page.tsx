import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/feedtldr/logo";

export const metadata: Metadata = { title: "Payment successful" };

/** Stripe checkout success redirect target (DOMAIN_URL/success). */
export default function SuccessPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <Logo />
      <CheckCircle
        weight="fill"
        className="size-14 text-pastel-green-foreground"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Payment successful</h1>
        <p className="max-w-sm text-muted-foreground">
          Your plan is active. Your new limits and credits are ready to use.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/app">Go to your feed</Link>
      </Button>
    </main>
  );
}
