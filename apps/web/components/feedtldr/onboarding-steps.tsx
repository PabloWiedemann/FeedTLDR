import { cn } from "@/lib/utils";

/**
 * Numbered progress trail for the onboarding wizard (DESIGN.md §8).
 * Steps read as done, current, or upcoming; the number is the static cue and
 * the colour change is the animated one.
 */
export function OnboardingSteps({
  steps,
  current,
}: {
  steps: readonly string[];
  /** Zero-based index of the step being shown. */
  current: number;
}) {
  return (
    <ol className="flex items-center gap-3" aria-label="Onboarding progress">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "grid size-7 place-items-center rounded-full text-xs font-medium transition-colors duration-300 ease-brand",
                done && "bg-pastel-green text-pastel-green-foreground",
                active && "bg-primary text-primary-foreground",
                !done && !active && "bg-secondary text-muted-foreground"
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                active ? "font-medium" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
            {index < steps.length - 1 && (
              <span className="h-px w-6 bg-border" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
