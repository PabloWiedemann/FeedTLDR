import { formatCompact } from "@/lib/format";

/** Metric tile for the source-data tab (posts / likes / views). */
export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border bg-card p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-title tabular-nums">
        {formatCompact(value)}
      </span>
    </div>
  );
}
