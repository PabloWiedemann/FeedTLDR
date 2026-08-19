import { cn } from "@/lib/utils";

/**
 * Sticky glass bar (DESIGN.md §5): translucent canvas with blur so content
 * scrolls beneath it. Shared by the marketing nav (hairline edge) and the
 * app bar (borderless); `className` sets the container width.
 */
export function GlassHeader({
  children,
  className,
  bordered = true,
}: {
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full bg-background/70 backdrop-blur-md backdrop-saturate-150",
        bordered && "border-b border-border/70"
      )}
    >
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
