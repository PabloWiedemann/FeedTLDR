"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chartAxis,
  chartAxisLine,
  chartBar,
  chartCategoryAxis,
  chartGrid,
  chartSeriesColor,
  chartTooltip,
} from "@/lib/chart-theme";
import { formatCompact } from "@/lib/format";
import type { SourceData } from "@/lib/api/types";

/** Charts are secondary to the numbers above them, so each one says what it
 *  shows in words first (DESIGN.md §10: charts get text alternatives). */
function ChartBlock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="mt-2 h-56 w-full">{children}</div>
    </section>
  );
}

function AccountBarChart({
  data,
  dataKey,
  color,
  yAxisWidth,
  tickFormatter,
}: {
  data: SourceData["per_account"];
  dataKey: "posts" | "avg_likes";
  color: string;
  yAxisWidth: number;
  tickFormatter?: (value: number) => string;
}) {
  return (
    <ResponsiveContainer>
      <BarChart data={data} margin={{ left: 0, right: 0 }}>
        <CartesianGrid {...chartGrid} />
        <XAxis dataKey="account" {...chartCategoryAxis} />
        <YAxis
          {...chartAxis}
          axisLine={false}
          width={yAxisWidth}
          tickFormatter={tickFormatter}
        />
        <Tooltip {...chartTooltip} />
        <Bar dataKey={dataKey} fill={color} radius={chartBar.radius} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** The three charts behind the current summary (legacy Source Data tab). */
export function FeedCharts({
  perAccount,
  timeline,
}: {
  perAccount: SourceData["per_account"];
  timeline: SourceData["timeline"];
}) {
  return (
    <>
      <ChartBlock
        title="Posts per account"
        description="How much each account contributed to this summary."
      >
        <AccountBarChart
          data={perAccount}
          dataKey="posts"
          color={chartSeriesColor.primary}
          yAxisWidth={36}
        />
      </ChartBlock>

      <ChartBlock
        title="Average likes per account"
        description="Which sources tend to earn the most engagement."
      >
        <AccountBarChart
          data={perAccount}
          dataKey="avg_likes"
          color={chartSeriesColor.secondary}
          yAxisWidth={44}
          tickFormatter={formatCompact}
        />
      </ChartBlock>

      <ChartBlock
        title="Posts timeline"
        description="When the analyzed posts were published."
      >
        <ResponsiveContainer>
          <LineChart data={timeline} margin={{ left: 0, right: 8 }}>
            <CartesianGrid {...chartGrid} />
            <XAxis
              dataKey="time"
              {...chartAxis}
              axisLine={chartAxisLine}
              minTickGap={40}
            />
            <YAxis {...chartAxis} axisLine={false} width={30} />
            <Tooltip contentStyle={chartTooltip.contentStyle} />
            <Line
              type="monotone"
              dataKey="count"
              stroke={chartSeriesColor.primary}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartBlock>
    </>
  );
}
