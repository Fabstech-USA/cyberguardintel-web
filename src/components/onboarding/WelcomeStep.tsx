"use client";

import { useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPlan } from "@/lib/plans";
import { readPlanSelection } from "@/lib/onboarding-storage";

type Props = {
  onChangePlan: () => void;
  onComplete: () => void;
};

// Server always sees "no selection"; client reads from sessionStorage on
// every render-pass snapshot. The empty subscribe is intentional — the value
// only changes via Plan → Welcome transitions that already trigger a render
// from the wizard, so we don't need storage events (which don't fire for
// same-tab writes anyway).
const EMPTY_SUBSCRIBE = (): (() => void) => () => {};

// Matches the four form steps the user is about to walk through so this screen
// actually sets expectations. Keep this list in sync with OnboardingWizard.
const OVERVIEW_STEPS = [
  {
    title: "Tell us about your organization",
    detail: "Name, size, and billing contact",
  },
  {
    title: "Confirm your HIPAA role",
    detail: "Covered entity, business associate, or both",
  },
  {
    title: "List the systems that touch PHI",
    detail: "EHRs, cloud storage, communications tools",
  },
  {
    title: "Select your technology stack",
    detail: "We'll auto-connect evidence collection",
  },
] as const;

export function WelcomeStep({
  onChangePlan,
  onComplete,
}: Props): React.JSX.Element {
  const planId = useSyncExternalStore(
    EMPTY_SUBSCRIBE,
    () => readPlanSelection()?.plan ?? null,
    () => null
  );

  const planName = planId ? getPlan(planId).name : null;

  return (
    <Card>
      <CardContent className="space-y-8 p-8">
        <div className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome to CyberGuardIntel AI
            </h2>
            <p className="text-sm text-muted-foreground">
              {planName ? (
                <>
                  Your <span className="font-semibold text-foreground">{planName}</span>{" "}
                  trial is live.
                </>
              ) : (
                <>Your free trial is live.</>
              )}{" "}
              Let&apos;s set up your compliance program — about 3 minutes of
              questions, then we generate your risk assessment and policies
              automatically.
            </p>
          </div>

          <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs">
            <span className="font-semibold text-brand">HIPAA</span>
            <span className="text-muted-foreground">available today</span>
            <span aria-hidden="true" className="text-muted-foreground/50">
              |
            </span>
            <span className="text-muted-foreground">SOC 2 coming soon</span>
            <span aria-hidden="true" className="text-muted-foreground/50">
              |
            </span>
            <span className="text-muted-foreground">
              More frameworks on the way
            </span>
          </div>
        </div>

        <ol className="space-y-3">
          {OVERVIEW_STEPS.map((item, idx) => (
            <li
              key={item.title}
              className="flex items-start gap-4 rounded-lg border border-transparent bg-muted/50 p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-muted-foreground">
                {idx + 1}
              </span>
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-foreground">
                  {item.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.detail}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <p className="text-xs text-muted-foreground">
          Need to step away? Your progress saves after each step — come back and
          pick up where you left off.
        </p>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
          <Button type="button" variant="outline" onClick={onChangePlan}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Change plan
          </Button>
          <Button
            type="button"
            onClick={onComplete}
            className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
          >
            Get started
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
