import { Hammer, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Placeholder for sections that are routed but not built yet, so the nav never
 * leads to a dead end or a 404.
 */
export function ComingSoon({
  title,
  description,
  icon: Icon = Hammer,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon className="size-7" />
        </span>
        <h2 className="mt-5 text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description ??
            "This section is on the way. It will appear here once it is ready."}
        </p>
        <span className="mt-5 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Coming soon
        </span>
      </CardContent>
    </Card>
  );
}
