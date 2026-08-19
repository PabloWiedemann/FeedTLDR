import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { SettingsNav } from "@/components/feedtldr/settings/settings-nav";

/** Settings shell: full-height flat nav panel left, section content right. */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col gap-4 p-2 lg:flex-row lg:gap-8">
      <SettingsNav />
      <main className="min-w-0 flex-1 px-2 pb-16 sm:px-6 lg:py-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
          <div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              <Link href="/app">
                <ArrowLeft /> Back to summary
              </Link>
            </Button>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
