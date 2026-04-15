"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CompleteStep(): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleFinish(): Promise<void> {
    setLoading(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch {
      // non-blocking
    }
    router.push("/dashboard");
  }

  return (
    <Card className="text-center">
      <CardHeader>
        <CardTitle>You&apos;re all set!</CardTitle>
        <CardDescription>
          Your organization is ready. Head to the dashboard to start tracking
          your compliance posture.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          size="lg"
          className="w-full"
          onClick={handleFinish}
          disabled={loading}
        >
          {loading ? "Redirecting..." : "Go to Dashboard"}
        </Button>
      </CardContent>
    </Card>
  );
}
