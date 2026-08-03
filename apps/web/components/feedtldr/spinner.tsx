import { CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/**
 * The app's one busy indicator. Decorative inside a button that already says
 * what it is doing; give it a `label` when it stands alone.
 */
export function Spinner({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <CircleNotch
      className={cn("animate-spin", className)}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
