import Link from "next/link";

import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { Button } from "@/components/ui/button";
import { DEMO_MAILTO, TRIAL_HREF } from "@/lib/marketing-ctas";
import { PLANS } from "@/lib/plans";

function formatFromPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

const starterMonthly = PLANS[0]?.monthlyPriceCents ?? 14_900;

export function PricingTeaser(): React.JSX.Element {
  return (
    <section id="pricing" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Simple pricing for growing teams
            </h2>
            <p className="mt-5 text-4xl font-semibold tracking-tight text-foreground tabular-nums sm:text-5xl">
              from {formatFromPrice(starterMonthly)}
              <span className="text-lg font-medium text-muted-foreground sm:text-xl">
                /mo
              </span>
            </p>
            <p className="mt-4 text-base text-muted-foreground">
              14-day free trial. No credit card. Plans scale with your team size
              and framework needs.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 min-w-[10.5rem] bg-brand px-5 text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
              >
                <Link href={TRIAL_HREF}>Start free trial</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 min-w-[10.5rem] px-5"
              >
                <a href={DEMO_MAILTO}>Book a demo</a>
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
