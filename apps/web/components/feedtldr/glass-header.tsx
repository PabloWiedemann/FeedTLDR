import { cn } from "@/lib/utils";

/**
 * Sticky glass bar (DESIGN.md §5): translucent canvas with blur and a
 * hairline edge, so content scrolls beneath it. Shared by the marketing
 * nav and the app bar; `className` sets the container width.
 */
export function GlassHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/70 backdrop-blur-md backdrop-saturate-150">
      <div
        className={cn(
          "mx-auto flex h-18 w-full items-center justify-between px-6",
          className
        )}
      >
        {children}
      </div>
    </header>
  );
}
