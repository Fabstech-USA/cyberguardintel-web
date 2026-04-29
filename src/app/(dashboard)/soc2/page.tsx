import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ArrowRight, Shield } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { userShouldRunOrgOnboardingWizard } from "@/lib/clerk-org-onboarding";
import { SOC2_TRUST_SERVICE_CARDS } from "@/lib/soc2-mvp-content";
import { DashboardFrameworkTabs } from "@/components/dashboard/DashboardFrameworkTabs";
import { Soc2WaitlistForm } from "@/components/dashboard/Soc2WaitlistForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function Soc2ComingSoonPage(): Promise<React.JSX.Element> {
  const { userId, orgId } = await auth();

  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/post-auth");

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true, onboardingStep: true },
  });

  if (!org) redirect("/post-auth");

  if (org.onboardingStep !== null) {
    const runOrgWizard = await userShouldRunOrgOnboardingWizard(userId, orgId);
    if (runOrgWizard) {
      redirect("/onboarding");
    }
  }

  const user = await currentUser();
  const defaultEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    "";

  return (
    <main className="flex w-full flex-col px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8 lg:px-8">
      <div className="w-full space-y-10 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-8">
        <DashboardFrameworkTabs active="soc2" />

        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/15 text-3xl font-bold text-brand">
              2
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              SOC 2 is coming soon
            </h1>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
              We&apos;re building SOC 2 on top of the same evidence collection
              engine powering HIPAA. Beta access opens in Q3 2026. Add yourself
              to the waitlist and you&apos;ll be first in.
            </p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-center text-lg font-semibold text-foreground">
            What&apos;s in the SOC 2 module
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {SOC2_TRUST_SERVICE_CARDS.map((item) => (
              <Card
                key={item.title}
                className="border-border bg-card shadow-none"
              >
                <CardContent className="flex gap-4 p-4 text-left">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-sm font-bold text-brand">
                    {item.letter}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-semibold text-foreground">
                      {item.title}
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-muted/30 p-6">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-lg font-semibold text-foreground">
              Join the waitlist
            </h2>
            <p className="text-sm text-muted-foreground">
              Get beta access when SOC 2 ships in Q3. We&apos;ll send one note —
              no marketing spam.
            </p>
          </div>
          <div className="mt-6">
            <Soc2WaitlistForm defaultEmail={defaultEmail} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-muted/50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                Upgrade to Business now to unlock SOC 2 the day it ships
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Business plan ($649/mo) gives you multi-framework access the
                moment SOC 2 is live. Today you&apos;ll use it for HIPAA and an
                expanded integration catalog; tomorrow you&apos;ll have SOC 2
                at no extra cost.
              </p>
              <Button
                className="mt-2 w-full bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active sm:w-auto"
                asChild
              >
                <Link href="/settings">
                  Compare plans
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
