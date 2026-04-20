import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function readinessLabel(score: number): { text: string; className: string } {
  if (score <= 24) {
    return {
      text: "Not ready",
      className:
        "border border-destructive/25 bg-destructive/10 text-destructive dark:bg-destructive/15",
    };
  }
  if (score <= 74) {
    return {
      text: "In progress",
      className: "border border-border bg-muted/60 text-foreground",
    };
  }
  return {
    text: "Strong",
    className:
      "border border-brand/30 bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand",
  };
}

type Props = {
  score: number;
};

export function ReadinessSection({ score }: Props): React.JSX.Element {
  const rounded = Math.min(100, Math.max(0, Math.round(score)));
  const badge = readinessLabel(rounded);
  const r = 52;
  const stroke = 8;
  const normalizedR = r - stroke / 2;
  const c = 2 * Math.PI * normalizedR;
  const dash = (rounded / 100) * c;

  return (
    <Card className="h-full border-border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Readiness</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pb-6">
        <div
          className="relative flex h-40 w-40 items-center justify-center"
          role="img"
          aria-label={`HIPAA readiness score ${rounded} out of 100`}
        >
          <svg
            className="h-full w-full -rotate-90 text-muted/30"
            viewBox="0 0 120 120"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r={normalizedR}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
            />
            <circle
              cx="60"
              cy="60"
              r={normalizedR}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c}`}
              strokeLinecap="round"
              className={rounded <= 24 ? "text-destructive" : "text-brand"}
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold tracking-tight text-foreground">
              {rounded}
            </span>
            <span className="text-sm text-muted-foreground">of 100</span>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn("font-medium", badge.className)}
        >
          {badge.text}
        </Badge>
      </CardContent>
    </Card>
  );
}
