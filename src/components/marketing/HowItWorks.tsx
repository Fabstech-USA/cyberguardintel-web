import { ScrollReveal } from "@/components/marketing/ScrollReveal";

const STEPS = [
  {
    step: "01",
    title: "Scaffold your program",
    body: "Confirm your HIPAA role, map your organization, and generate the policies and risk assessment your program needs.",
  },
  {
    step: "02",
    title: "Connect tools and close gaps",
    body: "Link the systems you already use. Evidence syncs to HIPAA controls. Your readiness score and Next up list show what matters most.",
  },
  {
    step: "03",
    title: "Export the audit package",
    body: "When you are ready, download a structured ZIP for auditors, partners, or HHS with the policies, evidence, and records they expect.",
  },
] as const;

export function HowItWorks(): React.JSX.Element {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              From blank slate to audit package
            </h2>
            <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
              Three steps keep your compliance program moving without a
              consulting project.
            </p>
          </div>
        </ScrollReveal>

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((item, index) => (
            <ScrollReveal key={item.step}>
              <li className="relative">
                {index < STEPS.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-5 left-[calc(100%+0.25rem)] hidden h-px w-[calc(100%-2rem)] bg-border md:block"
                  />
                ) : null}
                <p className="font-mono text-sm font-medium text-brand">
                  {item.step}
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  {item.body}
                </p>
              </li>
            </ScrollReveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
