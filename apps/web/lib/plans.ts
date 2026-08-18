const PLAN_NAMES: Record<string, string> = {
  admin: "Admin",
  basic: "Basic",
  free: "Free trial",
  pro: "Pro",
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
