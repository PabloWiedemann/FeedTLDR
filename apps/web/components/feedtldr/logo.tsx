import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Brand wordmark: bubble "Feed." image + plain TLDR suffix (mock 1). */
export function Logo({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45",
        className
      )}
      aria-label="Feed TLDR home"
    >
      <Image
        src="/brand/feed_logo.png"
        alt=""
        width={64}
        height={36}
        className="h-9 w-auto"
        priority
      />
      <span className="text-lg font-medium tracking-wide">TLDR</span>
    </Link>
  );
}
