import { cn } from "@/lib/utils";

/**
 * Page title block. Every screen states its name the same way, at the same
 * size, with the same rhythm below it (DESIGN.md §3).
 */
export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  /** Supporting controls that belong under the title (audio pill, filters). */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      <h1 className="text-display-lg">{title}</h1>
      {description && (
        <p className="max-w-prose text-muted-foreground text-pretty">
          {description}
        </p>
      )}
      {children}
    </header>
  );
}
