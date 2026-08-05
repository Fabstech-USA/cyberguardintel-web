import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type DashboardMetric = {
  title: string;
  value: string;
  hint: string;
  href?: string;
};

type Props = {
  metrics: DashboardMetric[];
};

export function DashboardMetricStrip({ metrics }: Props): React.JSX.Element {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m) => {
        const inner = (
          <CardContent className="flex flex-col gap-1 p-4">
            <div className="text-xs font-medium text-muted-foreground">
              {m.title}
            </div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              {m.value}
            </div>
            <div className="text-xs text-muted-foreground">{m.hint}</div>
          </CardContent>
        );

        if (m.href) {
          return (
            <Link
              key={m.title}
              href={m.href}
              className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card
                className={cn(
                  "h-full border-border bg-muted/40 shadow-none transition-colors hover:bg-muted/60"
                )}
              >
                {inner}
              </Card>
            </Link>
          );
        }

        return (
          <Card
            key={m.title}
            className="border-border bg-muted/40 shadow-none"
          >
            {inner}
          </Card>
        );
      })}
    </div>
  );
}
