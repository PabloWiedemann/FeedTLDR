import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** A settings group: bordered card on a soft shadow (DESIGN.md §8). */
export function SettingsCard({
  title,
  description,
  destructive,
  className,
  children,
}: {
  title?: string;
  description?: string;
  destructive?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "gap-4 shadow-card",
        destructive && "border-destructive/30",
        className
      )}
    >
      {(title || description) && (
        <CardHeader className="gap-1.5">
          {title && (
            <CardTitle
              className={cn(
                "text-base font-medium",
                destructive && "text-destructive"
              )}
            >
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className="text-pretty">
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

/** Page header inside a settings section: name it, then say what it does. */
export function SettingsPageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="text-title">{title}</h1>
      {description && (
        <p className="max-w-prose text-sm text-muted-foreground text-pretty">
          {description}
        </p>
      )}
    </header>
  );
}
