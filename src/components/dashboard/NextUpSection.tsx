import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardNextStep } from "@/lib/dashboard-next-steps";

type Props = {
  steps: readonly DashboardNextStep[];
};

export function NextUpSection({ steps }: Props): React.JSX.Element {
  return (
    <Card className="h-full border-border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Next up — biggest impact first
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-6">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-sm font-semibold text-muted-foreground">
                {step.order}
              </span>
              <div className="min-w-0 space-y-0.5">
                <div className="text-sm font-semibold text-foreground">
                  {step.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {step.subtitle}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className={cn(
                "w-full shrink-0 border-brand text-brand hover:bg-brand/10 hover:text-brand sm:w-auto"
              )}
              asChild
            >
              <Link href={step.href}>
                {step.ctaLabel}
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
