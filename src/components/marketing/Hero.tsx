import Link from "next/link";

import { BrandMark } from "@/components/marketing/BrandMark";
import { HeroProductPreview } from "@/components/marketing/HeroProductPreview";
import { Button } from "@/components/ui/button";
import { DEMO_MAILTO, TRIAL_HREF } from "@/lib/marketing-ctas";

export function Hero(): React.JSX.Element {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.48_0.09_161_/_0.16),transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.63_0.12_162_/_0.18),transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,oklch(0.7_0_0_/_0.08)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.7_0_0_/_0.08)_1px,transparent_1px)] [background-size:48px_48px] mask-[linear-gradient(to_bottom,black_40%,transparent)] dark:opacity-[0.2]"
      />

      <div className="relative mx-auto max-w-6xl px-6 pt-14 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <BrandMark size="hero" className="justify-center" />

          <h1 className="mt-8 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Know your HIPAA readiness before the audit does
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            AI drafts your policies and risk assessment. Integrations collect
            control-mapped evidence. Export a complete audit package when you
            need it.
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

          <p className="mt-4 text-sm text-muted-foreground">
            14-day free trial. No credit card required.
          </p>
        </div>

        <div className="mt-14 sm:mt-16">
          <HeroProductPreview />
        </div>
      </div>
    </section>
  );
}
