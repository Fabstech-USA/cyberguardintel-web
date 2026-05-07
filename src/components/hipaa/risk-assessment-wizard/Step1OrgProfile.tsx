"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Industry } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TEAM_SIZE_OPTIONS,
  bucketLabelForEmployeeCount,
  type TeamSizeValue,
} from "./team-size-options";
import type { HipaaSubjectType, WizardProfile } from "./types";

const HIPAA_ROLE_OPTIONS: ReadonlyArray<{
  value: HipaaSubjectType;
  label: string;
}> = [
  { value: "covered_entity", label: "Covered entity" },
  { value: "business_associate", label: "Business associate" },
  { value: "both", label: "Both" },
];

const INDUSTRY_OPTIONS: ReadonlyArray<{ value: Industry; label: string }> = [
  { value: Industry.HEALTHCARE, label: "Healthcare" },
  { value: Industry.TECHNOLOGY, label: "Technology" },
  { value: Industry.FINANCE, label: "Finance" },
  { value: Industry.ECOMMERCE, label: "E-commerce" },
  { value: Industry.OTHER, label: "Other" },
];

function teamSizeValueFromCount(count: number | null): TeamSizeValue | "" {
  if (count == null) return "";
  return bucketLabelForEmployeeCount(count) as TeamSizeValue;
}

type Props = {
  profile: WizardProfile;
  onChange: (next: WizardProfile) => void;
  onCancel: () => void;
  onContinue: () => void;
};

export function Step1OrgProfile({
  profile,
  onChange,
  onCancel,
  onContinue,
}: Props): React.JSX.Element {
  const [editing, setEditing] = useState(false);

  function handleNameChange(name: string): void {
    onChange({ ...profile, name });
  }
  function handleRoleChange(value: string): void {
    onChange({ ...profile, hipaaSubjectType: value as HipaaSubjectType });
  }
  function handleTeamSizeChange(value: string): void {
    const opt = TEAM_SIZE_OPTIONS.find((o) => o.value === value);
    onChange({ ...profile, employeeCount: opt?.employeeCount ?? null });
  }
  function handleIndustryChange(value: string): void {
    onChange({ ...profile, industry: value as Industry });
  }

  const canContinue = profile.name.trim().length >= 2 && profile.employeeCount != null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Step 1 of 5 - Organization profile
        </p>
        <h2 className="text-xl font-semibold tracking-tight">
          Confirm your organization profile
        </h2>
        <p className="text-sm text-muted-foreground">
          These values come from onboarding. Edit any field if something has
          changed.
        </p>
      </div>

      {!editing ? (
        <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
          <ProfileRow label="Organization" value={profile.name} />
          <ProfileRow
            label="HIPAA role"
            value={
              HIPAA_ROLE_OPTIONS.find(
                (o) => o.value === profile.hipaaSubjectType
              )?.label ?? "Not set"
            }
          />
          <ProfileRow
            label="Employees"
            value={bucketLabelForEmployeeCount(profile.employeeCount)}
          />
          <ProfileRow
            label="Industry"
            value={
              INDUSTRY_OPTIONS.find((o) => o.value === profile.industry)
                ?.label ?? "Not set"
            }
            isLast
          />
          <div className="flex justify-end border-t border-border bg-background/40 px-4 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-muted/40 p-4">
          <div className="space-y-2">
            <Label htmlFor="ra-org-name">Organization</Label>
            <Input
              id="ra-org-name"
              value={profile.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Sunrise Family Health"
              minLength={2}
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ra-hipaa-role">HIPAA role</Label>
              <Select
                value={profile.hipaaSubjectType}
                onValueChange={handleRoleChange}
              >
                <SelectTrigger id="ra-hipaa-role" className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {HIPAA_ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ra-employees">Employees</Label>
              <Select
                value={teamSizeValueFromCount(profile.employeeCount)}
                onValueChange={handleTeamSizeChange}
              >
                <SelectTrigger id="ra-employees" className="w-full">
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="ra-industry">Industry</Label>
            <Select value={profile.industry} onValueChange={handleIndustryChange}>
              <SelectTrigger id="ra-industry" className="w-full">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              Done editing
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function ProfileRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}): React.JSX.Element {
  return (
    <div
      className={
        "flex items-center justify-between px-4 py-3" +
        (isLast ? "" : " border-b border-border")
      }
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
