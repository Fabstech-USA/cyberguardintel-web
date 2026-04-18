"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";

const INDUSTRIES = [
  { value: "HEALTHCARE", label: "Healthcare" },
  { value: "TECHNOLOGY", label: "Technology" },
  { value: "FINANCE", label: "Finance" },
  { value: "ECOMMERCE", label: "E-Commerce" },
  { value: "OTHER", label: "Other" },
] as const;

const HIPAA_TYPES = [
  {
    value: "covered_entity",
    label: "Covered Entity",
    description: "Health plans, providers, or clearinghouses",
  },
  {
    value: "business_associate",
    label: "Business Associate",
    description: "Handle PHI on behalf of a covered entity",
  },
  {
    value: "both",
    label: "Both",
    description: "Act as both a covered entity and business associate",
  },
] as const;

type Props = {
  onComplete: () => void;
};

export function CreateOrgStep({ onComplete }: Props): React.JSX.Element {
  const { setActive } = useClerk();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("HEALTHCARE");
  const [employeeCount, setEmployeeCount] = useState("");
  const [hipaaSubjectType, setHipaaSubjectType] = useState("covered_entity");
  const [billingEmail, setBillingEmail] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          industry,
          employeeCount: employeeCount ? parseInt(employeeCount, 10) : undefined,
          hipaaSubjectType,
          billingEmail,
        }),
      });

      // Defensive: the server *should* always return JSON, but if it ever
      // returns an empty body (e.g. a crashed route), we surface a useful
      // message instead of the browser's opaque "Unexpected end of JSON input".
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

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>
          Tell us about your organization so we can tailor your compliance
          experience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              required
              minLength={2}
              maxLength={100}
              placeholder="Acme Health Systems"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger id="industry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee-count">Number of employees</Label>
            <Input
              id="employee-count"
              type="number"
              min={1}
              placeholder="50"
              value={employeeCount}
              onChange={(e) => setEmployeeCount(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>HIPAA classification</Label>
            <RadioGroup
              value={hipaaSubjectType}
              onValueChange={setHipaaSubjectType}
              className="space-y-2"
            >
              {HIPAA_TYPES.map((t) => (
                <label
                  key={t.value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem value={t.value} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">{t.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.description}
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-email">Billing email</Label>
            <Input
              id="billing-email"
              type="email"
              required
              placeholder="billing@acmehealth.com"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Organization"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
