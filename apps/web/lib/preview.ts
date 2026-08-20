/**
 * Dev-only onboarding preview (set NEXT_PUBLIC_ONBOARDING_PREVIEW=1 in
 * .env.local): lets an already-onboarded user walk through /onboarding
 * without any step or completion writes. The NODE_ENV guard compiles the
 * flag to `false` in production builds, so it cannot leak past dev.
 */
export const onboardingPreview =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_ONBOARDING_PREVIEW === "1";
