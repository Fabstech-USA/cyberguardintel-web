import { cn } from "@/lib/utils";

function gaugeColor(score: number): string {
  if (score < 40) return "text-destructive";
  if (score <= 70) return "text-amber-600 dark:text-amber-500";
  return "text-emerald-600 dark:text-emerald-500";
}

function readinessLabel(score: number): { text: string; className: string } {
  if (score < 40) {
    return {
      text: "Not ready",
      className:
        "border border-destructive/25 bg-destructive/10 text-destructive dark:bg-destructive/15",
    };
  }
  if (score <= 70) {
    return {
      text: "In progress",
      className:
        "border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400",
    };
  }
  return {
    text: "Strong",
    className:
      "border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400",
  };
}

type Props = {
  score: number;
  size?: number;
  className?: string;
};

export function ReadinessGauge({
  score,
  size = 160,
  className,
}: Props): React.JSX.Element {
  const rounded = Math.min(100, Math.max(0, Math.round(score)));
  const badge = readinessLabel(rounded);
  const stroke = 8;
  const r = (size - stroke) / 2;
  const normalizedR = r - stroke / 2;
  const c = 2 * Math.PI * normalizedR;
  const dash = (rounded / 100) * c;
  const viewBox = size;
  const center = viewBox / 2;

  return (
    <div
      className={cn("flex flex-col items-center gap-4", className)}
      role="img"
      aria-label={`HIPAA readiness score ${rounded} out of 100`}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          className="h-full w-full -rotate-90 text-muted/30"
          viewBox={`0 0 ${viewBox} ${viewBox}`}
          aria-hidden="true"
        >
          <circle
            cx={center}
            cy={center}
            r={normalizedR}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
          />
          <circle
            cx={center}
            cy={center}
            r={normalizedR}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${c}`}
            strokeLinecap="round"
            className={gaugeColor(rounded)}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tracking-tight text-foreground">
            {rounded}
          </span>
          <span className="text-sm text-muted-foreground">of 100</span>
        </div>
      </div>
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
          badge.className
        )}
      >
        {badge.text}
      </span>
    </div>
  );
}
