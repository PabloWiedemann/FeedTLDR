import { Progress } from "@/components/ui/progress";

/**
 * Quiet progress bar for the onboarding wizard (DESIGN.md §8): fills in step
 * fractions on the primary green. Step labels are for assistive tech only —
 * the steps explain themselves.
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
    <div className="w-full">
      <Progress
        className="bg-border"
        value={((current + 1) / steps.length) * 100}
        aria-label={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}
      />
      <p className="sr-only" aria-live="polite">
        Step {current + 1} of {steps.length}: {steps[current]}
      </p>
    </div>
  );
}
