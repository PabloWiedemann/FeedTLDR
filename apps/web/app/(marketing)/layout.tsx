import { MarketingNav } from "@/components/feedtldr/marketing-nav";
import { SiteFooter } from "@/components/feedtldr/site-footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingNav />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
