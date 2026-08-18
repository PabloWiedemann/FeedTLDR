const PLAN_NAMES: Record<string, string> = {
  admin: "Admin",
  basic: "Basic",
  free: "Free trial",
  pro: "Pro",
};

const PLAN_RANKS: Record<string, number> = {
  free: 0,
  basic: 1,
  pro: 2,
};

/** Human-readable plan name shared by account and pricing surfaces. */
export function planName(plan: string): string {
  return PLAN_NAMES[plan] ?? plan;
}

/** Compact account-menu label that distinguishes a plan from an action. */
export function accountPlanLabel(plan: string): string {
  const name = planName(plan);
  return plan === "free" ? name : `${name} plan`;
}

/** Whether moving from the current plan to the target plan is an upgrade. */
export function isPlanUpgrade(
  currentPlan: string | undefined,
  targetPlan: string
): boolean {
  if (!currentPlan) return false;
  return (PLAN_RANKS[targetPlan] ?? -1) > (PLAN_RANKS[currentPlan] ?? -1);
}
