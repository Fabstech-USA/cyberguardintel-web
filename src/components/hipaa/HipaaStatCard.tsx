import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { hipaaStatUi } from "@/components/hipaa/hipaa-stat-ui";

type HipaaStatCardProps = {
  label: string;
  value: string | number;
  valueClassName?: string;
};

export function HipaaStatCard({
  label,
  value,
  valueClassName = hipaaStatUi.statDefault,
}: HipaaStatCardProps) {
  return (
    <Card className={hipaaStatUi.statCard}>
      <CardContent className="px-4 py-3">
        <div className={hipaaStatUi.statLabel}>{label}</div>
        <div
          className={cn(
            "mt-0.5 text-2xl font-semibold tabular-nums",
            valueClassName
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
