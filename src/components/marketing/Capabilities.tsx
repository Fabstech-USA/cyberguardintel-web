import { ScrollReveal } from "@/components/marketing/ScrollReveal";

const CAPABILITIES = [
  {
    title: "Live readiness score",
    body: "A single 0 to 100 HIPAA readiness score updates as policies, evidence, BAAs, and training land. Next up ranks the work with the biggest impact.",
  },
  {
    title: "AI drafts you approve",
    body: "Generate policy and risk assessment drafts tailored to your organization. Everything stays in draft until a human reviews and approves it.",
  },
  {
    title: "Evidence from your stack",
    body: "Connect the tools you already run. Evidence syncs on a regular cadence and maps to HIPAA controls so you are not chasing screenshots.",
  },
  {
    title: "One-click audit package",
    body: "Export a structured ZIP with policies, evidence, BAAs, and training records ready for auditors, partners, or HHS.",
  },
] as const;

export function Capabilities(): React.JSX.Element {
  return (
    <section
      id="product"
      className="scroll-mt-20 border-t border-border/60 bg-muted/25 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Everything your HIPAA program needs in one place
            </h2>
            <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
              Built for clinics, practices, and health-tech vendors that need
              continuous readiness, not a one-time binder.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2">
          {CAPABILITIES.map((item) => (
            <ScrollReveal key={item.title}>
              <div className="border-t border-brand/30 pt-6">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  {item.body}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
