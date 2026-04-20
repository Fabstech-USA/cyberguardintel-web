"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CompleteStep(): React.JSX.Element {
  const router = useRouter();

  // No POST here: the tech-stack step already set onboardingStep=null on the
  // server, so this screen is purely a celebratory handoff.

  return (
    <Card>
      <CardContent className="space-y-8 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            You&apos;re all set
          </h2>
          <p className="text-sm text-muted-foreground">
            We&apos;re generating your risk assessment and HIPAA policies in the
            background. You&apos;ll see them on your dashboard in a few minutes.
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => router.push("/dashboard")}
          className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
        >
          Open dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
