import { formatCompact } from "@/lib/format";

/** Metric tile for the source-data tab (posts / likes / views). */
export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-3xl border bg-card p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">
        {formatCompact(value)}
      </span>
    </div>
  );
}
