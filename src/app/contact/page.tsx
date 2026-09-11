import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Mail, ShieldCheck } from "lucide-react";

import { ContactForm } from "@/components/contact/ContactForm";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { DEMO_MAILTO } from "@/lib/marketing-ctas";
import { ENTERPRISE_SALES_EMAIL } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Get in touch with the CyberGuardIntel AI team about sales, support, or security and compliance questions.",
};

export default function ContactPage(): React.JSX.Element {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <MarketingNav />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand">
              Contact
            </p>
            <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Talk to the CyberGuardIntel AI team
            </h1>
            <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
              Questions about pricing, a specific HIPAA control, or a security
              questionnaire for your own vendor review? Send us a message and
              a real person will get back to you.
            </p>
          </div>

          <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-14">
            <div className="space-y-8">
              <div className="flex gap-3.5">
                <Mail className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Sales & demos
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Evaluating CyberGuardIntel AI for your organization?{" "}
                    <a
                      href={DEMO_MAILTO}
                      className="font-medium text-brand hover:underline"
                    >
                      Book a demo
                    </a>{" "}
                    or email{" "}
                    <a
                      href={`mailto:${ENTERPRISE_SALES_EMAIL}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {ENTERPRISE_SALES_EMAIL}
                    </a>
                    .
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Security & compliance
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Need a security questionnaire answered, or want to discuss
                    a Business Associate Agreement? Pick{" "}
                    <span className="font-medium text-foreground">
                      Security &amp; compliance
                    </span>{" "}
                    in the form and we&rsquo;ll route it to the right person.
                    See our{" "}
                    <Link
                      href="/legal/privacy#phi"
                      className="font-medium text-brand hover:underline"
                    >
                      Privacy Policy
                    </Link>{" "}
                    for how we handle PHI.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5">
                <Building2 className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Company
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    CyberGuardIntel AI is built and operated by Fabstech LLC.
                    Read our{" "}
                    <Link
                      href="/legal/terms"
                      className="font-medium text-brand hover:underline"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/legal/privacy"
                      className="font-medium text-brand hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>

            <ContactForm />
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
