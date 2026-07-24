import Link from "next/link";

import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { Button } from "@/components/ui/button";
import { DEMO_MAILTO, TRIAL_HREF } from "@/lib/marketing-ctas";

export function FinalCta(): React.JSX.Element {
  return (
    <section className="border-t border-border/60">
      <div className="relative overflow-hidden bg-[linear-gradient(160deg,oklch(0.48_0.09_161)_0%,oklch(0.36_0.09_161)_55%,oklch(0.28_0.06_161)_100%)] px-6 py-20 text-brand-foreground sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]"
        />
        <ScrollReveal>
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Start your compliance program today
            </h2>
            <p className="mt-4 text-pretty text-base text-white/85 sm:text-lg">
              See your HIPAA readiness score in minutes. Invite your team when
              you are ready.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 min-w-[10.5rem] border-0 bg-white px-5 text-brand hover:bg-white/90"
              >
                <Link href={TRIAL_HREF}>Start free trial</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 min-w-[10.5rem] border-white/40 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white"
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
