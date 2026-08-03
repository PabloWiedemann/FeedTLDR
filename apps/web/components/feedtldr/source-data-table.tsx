import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCount } from "@/lib/format";
import type { SourceData } from "@/lib/api/types";

/**
 * The scraped CSV arrives as loosely-typed rows, so each column states how it
 * reads its own value rather than trusting a shared shape.
 */
type PostRow = SourceData["rows"][number];

function text(value: unknown): string {
  return String(value ?? "");
}

function count(value: unknown): string {
  return formatCount(Number(value ?? 0));
}

function PostText({ row }: { row: PostRow }) {
  const body = text(row.text);
  if (!row.url) return <>{body}</>;
  return (
    <a
      href={text(row.url)}
      target="_blank"
      rel="noreferrer"
      className="focus-ring rounded-xs text-foreground underline decoration-border underline-offset-2 transition-colors duration-150 hover:decoration-foreground"
    >
      {body}
    </a>
  );
}

/** Every post that went into the current summary. */
export function SourceDataTable({ rows }: { rows: SourceData["rows"] }) {
  return (
    <div className="overflow-x-auto rounded-card border bg-card">
      <Table className="min-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Posted</TableHead>
            <TableHead>Text</TableHead>
            <TableHead className="text-end">Likes</TableHead>
            <TableHead className="text-end">Views</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium whitespace-nowrap">
                @{text(row.userName)}
              </TableCell>
              <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                {text(row.createdAt)}
              </TableCell>
              <TableCell className="max-w-md">
                <PostText row={row} />
              </TableCell>
              <TableCell className="text-end tabular-nums">
                {count(row.likeCount)}
              </TableCell>
              <TableCell className="text-end tabular-nums">
                {count(row.viewCount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
