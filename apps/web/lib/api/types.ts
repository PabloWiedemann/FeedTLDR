/** Response shapes from the generated OpenAPI schema, named for app use. */
import type { components } from "./schema";

export type Me = components["schemas"]["MeResponse"];
export type Feed = components["schemas"]["FeedResponse"];
export type GlobalSettings = components["schemas"]["GlobalSettings"];
export type Accounts = components["schemas"]["AccountsResponse"];
export type GenerationStatus = components["schemas"]["GenerationStatus"];
export type GenerationCost = components["schemas"]["GenerationCostResponse"];
export type SourceData = components["schemas"]["SourceDataResponse"];
export type PlansResponse = components["schemas"]["PlansResponse"];
export type Plan = components["schemas"]["PlanPublic"];
export type BillingUsage = components["schemas"]["BillingUsageResponse"];
export type ChatMessage = components["schemas"]["ChatMessage"];
export type ChatResponse = components["schemas"]["ChatResponse"];
export type CreditState = components["schemas"]["CreditState"];
export type VerifyAccounts = components["schemas"]["VerifyAccountsResponse"];
export type ImportAccounts = components["schemas"]["ImportAccountsResponse"];
