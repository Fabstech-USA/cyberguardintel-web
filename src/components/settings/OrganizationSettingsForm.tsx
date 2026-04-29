"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Industry, OrgRole } from "@/generated/prisma";

type HipaaSubjectType = "covered_entity" | "business_associate" | "both" | null;
type TeamSize =
  | "unset"
  | "1-10"
  | "11-20"
  | "20-50"
  | "51-100"
  | "101-250"
  | "251+";

type OrganizationResponse = {
  organization: {
    id: string;
    clerkOrgId: string;
    name: string;
    slug: string;
    billingEmail: string;
    employeeCount: number | null;
    industry: Industry;
    hipaaSubjectType: HipaaSubjectType;
    techStack: string[];
    plan: string;
    planPeriod: string;
    trialEndsAt: string | null;
  } | null;
  currentUserRole: OrgRole;
};

function canEdit(role: OrgRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

function canDelete(role: OrgRole): boolean {
  return role === "OWNER";
}

function industryLabel(i: Industry): string {
  switch (i) {
    case "HEALTHCARE":
      return "Healthcare";
    case "TECHNOLOGY":
      return "Technology";
    case "FINANCE":
      return "Finance";
    case "ECOMMERCE":
      return "E-commerce";
    case "OTHER":
      return "Other";
    default:
      return i satisfies never;
  }
}

function hipaaLabel(v: Exclude<HipaaSubjectType, null>): string {
  switch (v) {
    case "covered_entity":
      return "Covered entity";
    case "business_associate":
      return "Business associate";
    case "both":
      return "Both";
    default:
      return v satisfies never;
  }
}

function employeeCountToTeamSize(n: number | null): TeamSize {
  if (!n || n <= 0) return "unset";
  if (n <= 10) return "1-10";
  if (n <= 20) return "11-20";
  if (n <= 50) return "20-50";
  if (n <= 100) return "51-100";
  if (n <= 250) return "101-250";
  return "251+";
}

function teamSizeToEmployeeCount(size: TeamSize): number | null {
  switch (size) {
    case "unset":
      return null;
    case "1-10":
      return 10;
    case "11-20":
      return 20;
    case "20-50":
      return 50;
    case "51-100":
      return 100;
    case "101-250":
      return 250;
    case "251+":
      return 251;
    default:
      return size satisfies never;
  }
}

export function OrganizationSettingsForm(): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [currentRole, setCurrentRole] = useState<OrgRole | null>(null);
  const [orgSlug, setOrgSlug] = useState<string>("");

  const [name, setName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [teamSize, setTeamSize] = useState<TeamSize>("unset");
  const [industry, setIndustry] = useState<Industry>("HEALTHCARE");
  const [hipaaSubjectType, setHipaaSubjectType] =
    useState<HipaaSubjectType>(null);
  const [techStack, setTechStack] = useState<string[]>([]);

  const [editMode, setEditMode] = useState(false);

  const [dangerOpen, setDangerOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const editable = useMemo(
    () => (currentRole ? canEdit(currentRole) : false),
    [currentRole]
  );
  const deletable = useMemo(
    () => (currentRole ? canDelete(currentRole) : false),
    [currentRole]
  );

  const formDisabled = !editable || saving || deleting || !editMode;

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);

        const res = await fetch("/api/settings/organization", {
          method: "GET",
          headers: { "content-type": "application/json" },
        });
        const data: OrganizationResponse = await res.json();
        if (!res.ok) {
          throw new Error((data as unknown as { error?: string }).error ?? "Failed to load organization");
        }

        if (!data.organization) {
          throw new Error("No active organization.");
        }

        if (cancelled) return;

        setCurrentRole(data.currentUserRole);
        setOrgSlug(data.organization.slug);
        setName(data.organization.name);
        setBillingEmail(data.organization.billingEmail);
        setTeamSize(employeeCountToTeamSize(data.organization.employeeCount));
        setIndustry(data.organization.industry);
        setHipaaSubjectType(data.organization.hipaaSubjectType);
        setTechStack(data.organization.techStack ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load settings.");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave(): Promise<void> {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const employee = teamSizeToEmployeeCount(teamSize);

      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          billingEmail,
          employeeCount: employee,
          industry,
          hipaaSubjectType,
        }),
      });

      const data = (await res.json()) as
        | { organization: { slug: string; name: string } }
        | { error: string; details?: unknown };
      if (!res.ok) {
        throw new Error("error" in data ? data.error : "Failed to save.");
      }

      setSuccess("Saved.");
      setEditMode(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(): Promise<void> {
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/settings/organization", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: confirmText }),
      });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete organization.");
      }

      setSuccess("Organization deleted.");
      router.push("/onboarding");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete organization.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold">Organization</h2>
        <p className="text-sm text-muted-foreground">
          Loading organization settings…
        </p>
      </div>
    );
  }

  if (error && !currentRole) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Organization</h2>
        <p className="mt-2 text-sm text-destructive">{error}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">Organization</h2>

      <Card className="p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Organization profile</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Used throughout your HIPAA program — risk assessments, policies,
                and audit packages.
              </p>
            </div>

            {editMode ? (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => void onSave()}
                  disabled={!editable || saving || deleting}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditMode(false);
                    setError(null);
                    setSuccess(null);
                  }}
                  disabled={saving || deleting}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setEditMode(true)}
                disabled={!editable || saving || deleting}
              >
                Edit
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="org-name">Legal name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={formDisabled}
                autoComplete="organization"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="org-slug">Slug</Label>
              <Input id="org-slug" value={orgSlug} disabled />
              <p className="text-xs text-muted-foreground">
                Used in URLs and evidence exports
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Industry</Label>
              <Select
                value={industry}
                onValueChange={(v) => setIndustry(v as Industry)}
                disabled={formDisabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      "HEALTHCARE",
                      "TECHNOLOGY",
                      "FINANCE",
                      "ECOMMERCE",
                      "OTHER",
                    ] as Industry[]
                  ).map((i) => (
                    <SelectItem key={i} value={i}>
                      {industryLabel(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Team size</Label>
              <Select
                value={teamSize}
                onValueChange={(v) => setTeamSize(v as TeamSize)}
                disabled={formDisabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Not set</SelectItem>
                  {(
                    ["1-10", "11-20", "20-50", "51-100", "101-250", "251+"] as const
                  ).map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>HIPAA entity type</Label>
              <Select
                value={hipaaSubjectType ?? "unset"}
                onValueChange={(v) =>
                  setHipaaSubjectType(
                    v === "unset" ? null : (v as HipaaSubjectType)
                  )
                }
                disabled={formDisabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select HIPAA entity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Not set</SelectItem>
                  {(["covered_entity", "business_associate", "both"] as const).map(
                    (v) => (
                      <SelectItem key={v} value={v}>
                        {hipaaLabel(v)}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="billing-email">Billing email</Label>
              <Input
                id="billing-email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                disabled={formDisabled}
                autoComplete="email"
              />
            </div>
          </div>

          {!editable ? (
            <p className="text-sm text-muted-foreground">
              Only Owners and Admins can edit organization settings.
            </p>
          ) : null}

          {success ? (
            <p className="text-sm text-muted-foreground">{success}</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Technology stack</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your selections inform which integrations and policies we prioritize.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => router.push("/integrations")}
            disabled={saving || deleting}
          >
            Update stack
          </Button>
        </div>

        <Separator className="my-4" />

        {techStack.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stack selected.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {techStack.map((s) => (
              <span
                key={s}
                className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <h3 className="text-base font-semibold text-destructive">Danger zone</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Deleting the organization removes all evidence, policies, audit logs, and
            billing records. This cannot be undone.
          </p>

          <Separator className="my-4" />

          {!dangerOpen ? (
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => setDangerOpen(true)}
              disabled={!deletable || deleting || saving}
            >
              Delete organization
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-sm text-muted-foreground">
                Type <span className="font-mono text-foreground">{orgSlug}</span> to
                confirm deletion.
              </div>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={!deletable || deleting}
                placeholder={orgSlug}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="destructive"
                  onClick={() => void onDelete()}
                  disabled={!deletable || deleting || confirmText !== orgSlug}
                >
                  {deleting ? "Deleting…" : "Delete organization"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDangerOpen(false);
                    setConfirmText("");
                  }}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
              {!deletable ? (
                <p className="text-sm text-muted-foreground">
                  Only Owners can delete an organization.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

