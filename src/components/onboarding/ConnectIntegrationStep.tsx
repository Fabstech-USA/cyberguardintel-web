"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const INTEGRATIONS = [
  {
    type: "aws",
    name: "AWS",
    description: "Import IAM policies, CloudTrail logs, and S3 configurations",
  },
  {
    type: "google-workspace",
    name: "Google Workspace",
    description: "Sync user accounts, MFA status, and device management",
  },
  {
    type: "github",
    name: "GitHub",
    description: "Pull branch protection rules, access reviews, and audit logs",
  },
  {
    type: "okta",
    name: "Okta",
    description: "Import SSO policies, MFA enrollment, and user directories",
  },
] as const;

type Props = {
  onComplete: () => void;
};

export function ConnectIntegrationStep({
  onComplete,
}: Props): React.JSX.Element {
  const [loading, setLoading] = useState(false);

  async function handleSkip(): Promise<void> {
    setLoading(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch {
      // non-blocking
    }
    setLoading(false);
    onComplete();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect an integration</CardTitle>
        <CardDescription>
          Integrations automatically collect compliance evidence. You can connect
          more later from the Integrations page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {INTEGRATIONS.map((int) => (
            <a
              key={int.type}
              href={`/integrations/connect/${int.type}`}
              className="flex flex-col gap-1 rounded-lg border border-border p-4 transition-colors hover:border-primary hover:bg-muted"
            >
              <span className="text-sm font-medium">{int.name}</span>
              <span className="text-xs text-muted-foreground">
                {int.description}
              </span>
            </a>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleSkip}
          disabled={loading}
        >
          Skip for now
        </Button>
      </CardContent>
    </Card>
  );
}
