import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Inline message block: the demo banner, plan-limit warnings, blocked-action
 * explanations. Colour comes from the semantic pastels (DESIGN.md §2), which
 * are the only place colour carries meaning in this product.
 */
const noticeVariants = cva("flex flex-col gap-2 text-sm text-pretty", {
  variants: {
    tone: {
      info: "text-pastel-blue-foreground",
      warning: "text-pastel-yellow-foreground",
      success: "text-pastel-green-foreground",
      error: "text-destructive font-medium",
    },
    filled: {
      true: "rounded-card px-5 py-4",
      false: "",
    },
  },
  compoundVariants: [
    { tone: "info", filled: true, class: "bg-pastel-blue" },
    { tone: "warning", filled: true, class: "bg-pastel-yellow" },
    { tone: "success", filled: true, class: "bg-pastel-green" },
    { tone: "error", filled: true, class: "bg-pastel-red" },
  ],
  defaultVariants: { tone: "info", filled: false },
});

export function Notice({
  title,
  children,
  tone,
  filled,
  className,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof noticeVariants> & { title?: string }) {
  return (
    <div
      data-slot="notice"
      role={tone === "error" ? "alert" : undefined}
      className={cn(noticeVariants({ tone, filled }), className)}
      {...props}
    >
      {title && <p className="font-medium">{title}</p>}
      {children}
    </div>
  );
}
