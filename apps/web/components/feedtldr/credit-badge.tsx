import { Sparkle } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/** Credit cost + remaining balance (generate dialog, pricing). */
export function CreditBadge({
  cost,
  remaining,
  className,
}: {
  cost: number;
  remaining?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-end gap-0.5", className)}>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium tabular-nums">
        <Sparkle className="size-3.5" aria-hidden="true" />
        {cost} credits
      </span>
      {remaining !== undefined && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {remaining} credits left
        </span>
      )}
    </div>
  );
}
