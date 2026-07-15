import { HelpTip } from "@/components/shared/HelpTip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SAFEGUARD_BUCKETS,
  type SafeguardBucket,
} from "@/lib/dashboard-safeguards";

type Props = {
  scores: Record<SafeguardBucket, number>;
};

const BUCKET_HELP: Record<SafeguardBucket, string> = {
  Administrative:
    "People and process controls: policies, training, risk analysis, and workforce access procedures.",
  Physical:
    "Facility and device protections: locked areas, workstation security, and media disposal.",
  Technical:
    "IT controls: access control, encryption, audit logs, and transmission security.",
  Organizational:
    "Business-associate and vendor arrangements that keep PHI protected across partners.",
};

export function SafeguardBreakdownSection({
  scores,
}: Props): React.JSX.Element {
  return (
    <Card className="border-border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="inline-flex items-center gap-1.5 text-base font-semibold">
          HIPAA safeguard breakdown
          <HelpTip
            label="About safeguard breakdown"
            content="HIPAA groups safeguards into Administrative, Physical, Technical, and Organizational. Each bar is the average score of controls in that group. Use it to see where to focus next."
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pb-6">
        {SAFEGUARD_BUCKETS.map((bucket) => {
          const value = scores[bucket];
          return (
            <div key={bucket} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  {bucket}
                  <HelpTip
                    label={`About ${bucket} safeguards`}
                    content={BUCKET_HELP[bucket]}
                  />
                </span>
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
