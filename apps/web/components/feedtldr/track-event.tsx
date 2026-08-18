"use client";

import { useEffect } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

/**
 * Fires one analytics event when the page renders. Renders nothing; exists so
 * server components (e.g. the Stripe success page) can capture events.
 */
export function TrackEvent({ event }: { event: AnalyticsEvent }) {
  useEffect(() => track(event), [event]);
  return null;
}
