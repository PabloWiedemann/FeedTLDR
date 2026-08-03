import Image from "next/image";
import { cn } from "@/lib/utils";

/** Composed empty state: mascot, message, one action (DESIGN.md §8). */
export function EmptyState({
  title,
  description,
  action,
  withMascot = true,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  withMascot?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 py-16 text-center",
        className
      )}
    >
      {withMascot && (
        <Image
          src="/brand/landing_image_mascot.png"
          alt=""
          width={160}
          height={160}
          className="h-32 w-auto opacity-90"
        />
      )}
      <h2 className="text-section">{title}</h2>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground text-pretty">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
