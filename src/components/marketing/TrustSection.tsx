import { FileCheck2, Lock, ShieldCheck, UserCheck } from "lucide-react";

import { LogoMark } from "@/components/brand/LogoMark";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "MFA on every plan",
    body: "Multi-factor authentication is enforced for all accounts.",
  },
  {
    icon: Lock,
    title: "Encrypted evidence",
    body: "Evidence files are stored with SSE-KMS encryption at rest.",
  },
  {
    icon: UserCheck,
    title: "Human approval for AI",
    body: "AI-generated policies and assessments stay draft until you approve.",
  },
  {
    icon: FileCheck2,
    title: "HIPAA and SOC 2 aligned",
    body: "Built for HIPAA programs today, with SOC 2 scaffolding on the roadmap.",
  },
] as const;

export function TrustSection(): React.JSX.Element {
  return (
    <section className="border-t border-border/60 bg-muted/30 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <LogoMark
              size={40}
              className="mx-auto"
              title="CyberGuardIntel"
            />
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Security built into the product
            </h2>
            <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
              Compliance software should hold itself to the same bar it asks of
              you.
            </p>
          </div>
        </ScrollReveal>

        <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_POINTS.map((item) => (
            <ScrollReveal key={item.title}>
              <li>
                <item.icon
                  className="size-5 text-brand"
                  aria-hidden="true"
                  strokeWidth={1.75}
                />
                <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </li>
            </ScrollReveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
