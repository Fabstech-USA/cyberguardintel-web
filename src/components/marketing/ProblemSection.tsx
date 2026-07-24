import { ScrollReveal } from "@/components/marketing/ScrollReveal";

export function ProblemSection(): React.JSX.Element {
  return (
    <section className="border-t border-border/60 bg-muted/30 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Compliance work scatters until an auditor asks for proof
            </h2>
            <p className="mt-5 text-pretty text-base text-muted-foreground sm:text-lg">
              Policies live in folders. BAAs sit in inboxes. Evidence is
              screenshots and spreadsheets. Training records are somewhere else.
              Covered entities and business associates waste weeks reassembling
              the story when a partner, HHS, or customer needs it.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
