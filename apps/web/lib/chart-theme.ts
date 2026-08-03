/**
 * Recharts takes styles as JS objects, so it cannot read Tailwind classes.
 * These are the design tokens expressed as the props Recharts expects — the
 * one place a chart may name a colour, and only ever as a `var(--token)`.
 */

export const chartAxis = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
  tickLine: false,
} as const;

export const chartGrid = {
  stroke: "var(--border)",
  vertical: false,
} as const;

export const chartAxisLine = { stroke: "var(--border)" } as const;

export const chartTooltip = {
  cursor: { fill: "var(--secondary)" },
  contentStyle: {
    borderRadius: "var(--radius-field)",
    border: "1px solid var(--border)",
    background: "var(--card)",
    fontSize: 12,
  },
} as const;

/** Category labels are long handles, so they sit at an angle under the axis. */
export const chartCategoryAxis = {
  ...chartAxis,
  axisLine: chartAxisLine,
  interval: 0 as const,
  angle: -30,
  textAnchor: "end" as const,
  height: 70,
};

export const chartBar = { radius: [4, 4, 0, 0] as [number, number, number, number] };

export const chartSeriesColor = {
  primary: "var(--chart-1)",
  secondary: "var(--chart-2)",
} as const;
