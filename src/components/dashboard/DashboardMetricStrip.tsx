import { Card, CardContent } from "@/components/ui/card";

type Metric = {
  title: string;
  value: string;
  hint: string;
};

type Props = {
  metrics: Metric[];
};

export function DashboardMetricStrip({ metrics }: Props): React.JSX.Element {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m) => (
        <Card
          key={m.title}
          className="border-border bg-muted/40 shadow-none"
        >
          <CardContent className="flex flex-col gap-1 p-4">
            <div className="text-xs font-medium text-muted-foreground">
              {m.title}
            </div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              {m.value}
            </div>
            <div className="text-xs text-muted-foreground">{m.hint}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
