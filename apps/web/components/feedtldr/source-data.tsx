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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./empty-state";
import { StatCard } from "./stat-card";
import { useSourceData } from "@/lib/hooks";
import { formatCompact, formatCount } from "@/lib/format";

const axisStyle = { fontSize: 11, fill: "var(--muted-foreground)" };

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

/** Source-data tab (legacy pages/app.py data tab): stats, charts, raw table. */
export function SourceDataView({ enabled }: { enabled: boolean }) {
  const { data, isLoading, isError } = useSourceData(enabled);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
        <Skeleton className="h-56 rounded-3xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        withMascot={false}
        title="No source data yet"
        description="Generate a summary first; the posts behind it will show up here."
      />
    );
  }

  const topAccounts = data.per_account.slice(0, 12);

  return (
    <div className="flex flex-col gap-10 pt-2">
      <p className="text-sm text-muted-foreground" style={{ textWrap: "pretty" }}>
        The posts behind your current summary: engagement, posting activity,
        and the full list that was analyzed.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total posts" value={data.total_posts} />
        <StatCard label="Total likes" value={data.total_likes} />
        <StatCard label="Total views" value={data.total_views} />
      </div>

      <ChartBlock
        title="Posts per account"
        description="How much each account contributed to this summary."
      >
        <ResponsiveContainer>
          <BarChart data={topAccounts} margin={{ left: 0, right: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="account"
              tick={axisStyle}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={70}
            />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ fill: "var(--secondary)" }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="posts" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBlock>

      <ChartBlock
        title="Average likes per account"
        description="Which sources tend to earn the most engagement."
      >
        <ResponsiveContainer>
          <BarChart data={topAccounts} margin={{ left: 0, right: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="account"
              tick={axisStyle}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={70}
            />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => formatCompact(v)}
            />
            <Tooltip
              cursor={{ fill: "var(--secondary)" }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="avg_likes"
              fill="var(--chart-2)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartBlock>

      <ChartBlock
        title="Posts timeline"
        description="When the analyzed posts were published."
      >
        <ResponsiveContainer>
          <LineChart data={data.timeline} margin={{ left: 0, right: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="time"
              tick={axisStyle}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={40}
            />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={30} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartBlock>

      <section className="flex flex-col gap-3">
        <h3 className="font-medium">Raw posts</h3>
        <p className="text-sm text-muted-foreground">
          All {formatCount(data.total_posts)} posts used for this summary.
        </p>
        <div className="overflow-x-auto rounded-3xl border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-start">
                <th className="px-4 py-3 text-start font-medium">Account</th>
                <th className="px-4 py-3 text-start font-medium">Posted</th>
                <th className="px-4 py-3 text-start font-medium">Text</th>
                <th className="px-4 py-3 text-end font-medium">Likes</th>
                <th className="px-4 py-3 text-end font-medium">Views</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className="border-b last:border-b-0 align-top">
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    @{String(row.userName ?? "")}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {String(row.createdAt ?? "")}
                  </td>
                  <td className="max-w-md px-4 py-3">
                    {row.url ? (
                      <a
                        href={String(row.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground"
                      >
                        {String(row.text ?? "")}
                      </a>
                    ) : (
                      String(row.text ?? "")
                    )}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums">
                    {formatCount(Number(row.likeCount ?? 0))}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums">
                    {formatCount(Number(row.viewCount ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
