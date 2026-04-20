import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SAFEGUARD_BUCKETS,
  type SafeguardBucket,
} from "@/lib/dashboard-safeguards";

type Props = {
  scores: Record<SafeguardBucket, number>;
};

export function SafeguardBreakdownSection({
  scores,
}: Props): React.JSX.Element {
  return (
    <Card className="border-border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          HIPAA safeguard breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pb-6">
        {SAFEGUARD_BUCKETS.map((bucket) => {
          const value = scores[bucket];
          return (
            <div key={bucket} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">{bucket}</span>
                <span className="tabular-nums text-muted-foreground">
                  {value} / 100
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/80">
                <div
                  className="h-full rounded-full bg-brand/70 transition-[width]"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
