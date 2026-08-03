"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./empty-state";
import { FeedCharts } from "./feed-charts";
import { SourceDataTable } from "./source-data-table";
import { StatCard } from "./stat-card";
import { useSourceData } from "@/lib/api/queries";
import { formatCount } from "@/lib/format";

/** Accounts shown in the per-account charts before they become unreadable. */
const CHARTED_ACCOUNTS = 12;

function SourceDataSkeleton() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
      </div>
      <Skeleton className="h-56 rounded-card" />
    </div>
  );
}

/** Source-data tab (legacy pages/app.py data tab): stats, charts, raw table. */
export function SourceDataView({ enabled }: { enabled: boolean }) {
  const { data, isLoading, isError } = useSourceData(enabled);

  if (isLoading) return <SourceDataSkeleton />;

  if (isError || !data) {
    return (
      <EmptyState
        withMascot={false}
        title="No source data yet"
        description="Generate a summary first; the posts behind it will show up here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-10 pt-2">
      <p className="text-sm text-muted-foreground text-pretty">
        The posts behind your current summary: engagement, posting activity, and
        the full list that was analyzed.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total posts" value={data.total_posts} />
        <StatCard label="Total likes" value={data.total_likes} />
        <StatCard label="Total views" value={data.total_views} />
      </div>

      <FeedCharts
        perAccount={data.per_account.slice(0, CHARTED_ACCOUNTS)}
        timeline={data.timeline}
      />

      <section className="flex flex-col gap-3">
        <h3 className="font-medium">Raw posts</h3>
        <p className="text-sm text-muted-foreground">
          All {formatCount(data.total_posts)} posts used for this summary.
        </p>
        <SourceDataTable rows={data.rows} />
      </section>
    </div>
  );
}
