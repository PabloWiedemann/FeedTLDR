import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { SettingsNav } from "@/components/feedtldr/settings/settings-nav";

/** Settings shell: back link over the full-height nav panel, content right. */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col gap-4 p-2 animate-in fade-in slide-in-from-bottom-2 duration-200 ease-brand md:flex-row md:gap-8">
      <div className="flex flex-col gap-2 md:sticky md:top-2 md:h-[calc(100dvh-1rem)] md:w-64 md:shrink-0">
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
        <SettingsNav />
      </div>
      <main className="min-w-0 flex-1 px-4 pb-16 sm:px-6 md:py-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
          {children}
        </div>
      </main>
    </div>
  );
}
