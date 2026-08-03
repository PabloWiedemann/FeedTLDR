/**
 * Credits arrive as four numbers (monthly and prepaid, left and limit). Every
 * screen that shows a balance or a meter derives it here, so "how many credits
 * do I have" has exactly one answer.
 */
import type { CreditState } from "@/lib/api/types";

export function creditsLeft(credits: CreditState): number {
  return credits.monthly_left + credits.prepaid_left;
}

export function creditsTotal(credits: CreditState): number {
  return credits.monthly_limit + credits.prepaid_limit;
}

export function creditsUsed(credits: CreditState): number {
  return creditsTotal(credits) - creditsLeft(credits);
}

/** Share of the allowance consumed, 0–100, safe when the allowance is zero. */
export function creditsUsedPercent(credits: CreditState): number {
  return (creditsUsed(credits) / Math.max(1, creditsTotal(credits))) * 100;
}
