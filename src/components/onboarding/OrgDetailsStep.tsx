"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { clearPlanSelection, readPlanSelection } from "@/lib/onboarding-storage";

// Team-size ranges map to a representative employeeCount so the plan
// recommender in /lib/plans.ts still works. Values chosen to land inside the
// tier they match (STARTER ≤ 15, GROWTH ≤ 100, BUSINESS ≤ 300, ENTERPRISE > 300).
const TEAM_SIZE_OPTIONS = [
  { value: "1-15", label: "1–15", employeeCount: 15 },
  { value: "16-50", label: "16–50", employeeCount: 50 },
  { value: "51-100", label: "51–100", employeeCount: 100 },
  { value: "101-300", label: "101–300", employeeCount: 300 },
  { value: "300+", label: "300+", employeeCount: 500 },
] as const;

const JOB_TITLE_OPTIONS = [
  "Compliance lead",
  "Security lead",
  "CTO / Engineering lead",
  "Operations / HR lead",
  "Founder / CEO",
  "Privacy officer",
  "Other",
] as const;

type Props = {
  onBack: () => void;
  onComplete: () => void;
};

export function OrgDetailsStep({ onBack, onComplete }: Props): React.JSX.Element {
  const { setActive } = useClerk();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [teamSize, setTeamSize] = useState<string>("");
  const [jobTitle, setJobTitle] = useState<string>("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const teamRange = TEAM_SIZE_OPTIONS.find((o) => o.value === teamSize);
    const planSelection = readPlanSelection();

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          billingEmail,
          employeeCount: teamRange?.employeeCount,
          jobTitle: jobTitle || undefined,
          plan: planSelection?.plan,
          period: planSelection?.period,
        }),
      });

      const raw = await res.text();
      const data = raw
        ? ((): { error?: string; clerkOrgId?: string } => {
            try {
              return JSON.parse(raw) as {
                error?: string;
                clerkOrgId?: string;
              };
            } catch {
              return {};
            }
          })()
        : {};

      if (!res.ok) {
        throw new Error(
          data.error ??
            `Failed to create organization (${res.status} ${res.statusText})`
        );
      }

      if (data.clerkOrgId) {
        await setActive({ organization: data.clerkOrgId });
      }

      // Plan + period are now persisted on the org row; the sessionStorage
      // copy is no longer needed and would only cause stale reads on a later
      // wizard re-entry.
      clearPlanSelection();

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const canContinue = name.trim().length >= 2 && billingEmail.includes("@") && teamSize && jobTitle;

  return (
    <Card>
      <CardContent className="space-y-8 p-8">
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Getting started
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Tell us about your organization
          </h2>
          <p className="text-sm text-muted-foreground">
            We use this to tailor your compliance program. You can change any of
            this later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="org-name">
              Organization name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="org-name"
              required
              minLength={2}
              maxLength={100}
              placeholder="Sunrise Family Health"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-email">
              Billing email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="billing-email"
              type="email"
              required
              placeholder="admin@sunrisefamilyhealth.com"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="team-size">Team size</Label>
              <Select value={teamSize} onValueChange={setTeamSize}>
                <SelectTrigger id="team-size" className="w-full">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_SIZE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-title">
                Your role <span className="text-destructive">*</span>
              </Label>
              <Select value={jobTitle} onValueChange={setJobTitle}>
                <SelectTrigger id="job-title" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TITLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back
            </Button>
            <Button
              type="submit"
              disabled={loading || !canContinue}
              className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
            >
              {loading ? "Saving..." : "Continue"}
              {!loading && (
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
