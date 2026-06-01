"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Industry, PolicyType } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPolicyDisplayTitle } from "@/lib/hipaa-policy-catalog";
import type { AiPolicyContextOverrides } from "@/lib/policy-generation-context";
import {
  emptyPolicyGenerateForm,
  formValuesToContextOverrides,
  snapshotToPolicyGenerateForm,
  type PolicyGenerateFormValues,
} from "@/lib/policy-generation-context";

const TEXTAREA_CLASS =
  "flex min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyType: PolicyType;
  onGenerate: (context: AiPolicyContextOverrides) => Promise<void>;
};

const HIPAA_ROLE_OPTIONS = [
  { value: "covered_entity", label: "Covered entity" },
  { value: "business_associate", label: "Business associate" },
  { value: "both", label: "Both" },
] as const;

const INDUSTRY_OPTIONS = [
  { value: Industry.HEALTHCARE, label: "Healthcare" },
  { value: Industry.TECHNOLOGY, label: "Technology" },
  { value: Industry.FINANCE, label: "Finance" },
  { value: Industry.ECOMMERCE, label: "E-commerce" },
  { value: Industry.OTHER, label: "Other" },
] as const;

const YES_NO_OPTIONS = [
  { value: "unset", label: "Not specified" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

function TriStateSelect({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: "" | "yes" | "no";
  onChange: (value: "" | "yes" | "no") => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value || "unset"}
        onValueChange={(next) =>
          onChange(next === "unset" ? "" : (next as "yes" | "no"))
        }
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {YES_NO_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PolicyGenerateDialog({
  open,
  onOpenChange,
  policyType,
  onGenerate,
}: Props): React.JSX.Element {
  const [form, setForm] = useState<PolicyGenerateFormValues>(
    emptyPolicyGenerateForm()
  );
  const [loadingContext, setLoadingContext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoadingContext(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch("/api/hipaa/policies/generate-context", {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          snapshot?: Parameters<typeof snapshotToPolicyGenerateForm>[0];
          hipaaSubjectType?: Parameters<
            typeof snapshotToPolicyGenerateForm
          >[1];
        };
        if (!res.ok || !data.snapshot) {
          throw new Error(data.error ?? "Could not load organization context");
        }
        if (cancelled) return;
        setForm(
          snapshotToPolicyGenerateForm(
            data.snapshot,
            data.hipaaSubjectType ?? null
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load context"
          );
        }
      } finally {
        if (!cancelled) setLoadingContext(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  function update<K extends keyof PolicyGenerateFormValues>(
    key: K,
    value: PolicyGenerateFormValues[K]
  ): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(): Promise<void> {
    if (!form.org_name.trim()) {
      setError("Organization name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onGenerate(formValuesToContextOverrides(form));
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setSubmitting(false);
    }
  }

  const displayTitle = getPolicyDisplayTitle(policyType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-border space-y-1 border-b px-6 py-4">
          <DialogTitle>Generate {displayTitle}</DialogTitle>
          <DialogDescription>
            Confirm organization details and add optional context so the AI draft
            matches your environment. Batch generation still uses profile data
            only.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loadingContext ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading organization profile…
            </p>
          ) : (
            <div className="space-y-6">
              <section className="space-y-4">
                <h3 className="text-sm font-medium">Organization profile</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="pg-org-name">Organization name</Label>
                    <Input
                      id="pg-org-name"
                      value={form.org_name}
                      onChange={(event) => update("org_name", event.target.value)}
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pg-hipaa-role">HIPAA role</Label>
                    <Select
                      value={form.hipaaSubjectType}
                      onValueChange={(value) =>
                        update(
                          "hipaaSubjectType",
                          value as PolicyGenerateFormValues["hipaaSubjectType"]
                        )
                      }
                      disabled={submitting}
                    >
                      <SelectTrigger id="pg-hipaa-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HIPAA_ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pg-industry">Industry</Label>
                    <Select
                      value={form.industry}
                      onValueChange={(value) =>
                        update("industry", value as Industry)
                      }
                      disabled={submitting}
                    >
                      <SelectTrigger id="pg-industry">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pg-employees">Employee count</Label>
                    <Input
                      id="pg-employees"
                      type="number"
                      min={0}
                      value={form.employee_count}
                      onChange={(event) =>
                        update(
                          "employee_count",
                          Math.max(0, Number(event.target.value) || 0)
                        )
                      }
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="pg-phi-systems">PHI systems in scope</Label>
                    <textarea
                      id="pg-phi-systems"
                      value={form.phi_systems}
                      onChange={(event) =>
                        update("phi_systems", event.target.value)
                      }
                      placeholder="Epic EHR, patient portal, billing system"
                      disabled={submitting}
                      rows={2}
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="pg-tech-stack">Technology stack</Label>
                    <textarea
                      id="pg-tech-stack"
                      value={form.tech_stack}
                      onChange={(event) => update("tech_stack", event.target.value)}
                      placeholder="AWS, Microsoft 365, CrowdStrike"
                      disabled={submitting}
                      rows={2}
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="pg-controls">Existing controls</Label>
                    <textarea
                      id="pg-controls"
                      value={form.existing_controls}
                      onChange={(event) =>
                        update("existing_controls", event.target.value)
                      }
                      placeholder="MFA, annual training, encrypted laptops"
                      disabled={submitting}
                      rows={2}
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                </div>
              </section>

              <Collapsible defaultOpen>
                <CollapsibleTrigger className="text-sm font-medium hover:underline">
                  Practice details (optional)
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pg-provider-category">Provider category</Label>
                      <Input
                        id="pg-provider-category"
                        value={form.provider_category}
                        onChange={(event) =>
                          update("provider_category", event.target.value)
                        }
                        placeholder="Primary care, dental, behavioral health"
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pg-locations">Number of locations</Label>
                      <Input
                        id="pg-locations"
                        value={form.number_of_locations}
                        onChange={(event) =>
                          update("number_of_locations", event.target.value)
                        }
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="pg-states">States of operation</Label>
                      <Input
                        id="pg-states"
                        value={form.states_of_operation}
                        onChange={(event) =>
                          update("states_of_operation", event.target.value)
                        }
                        placeholder="California, Nevada"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible>
                <CollapsibleTrigger className="text-sm font-medium hover:underline">
                  Systems & platforms (optional)
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["practice_management_system", "Practice management"],
                      ["patient_portal", "Patient portal"],
                      ["telehealth_platform", "Telehealth platform"],
                      ["cloud_storage", "Cloud storage / file sharing"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={`pg-${key}`}>{label}</Label>
                      <Input
                        id={`pg-${key}`}
                        value={form[key]}
                        onChange={(event) => update(key, event.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  ))}
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="pg-other-ephi">Other ePHI systems</Label>
                    <textarea
                      id="pg-other-ephi"
                      value={form.other_ephi_systems}
                      onChange={(event) =>
                        update("other_ephi_systems", event.target.value)
                      }
                      disabled={submitting}
                      rows={2}
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible>
                <CollapsibleTrigger className="text-sm font-medium hover:underline">
                  Security posture (optional)
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pg-security-officer">
                      Security officer name & title
                    </Label>
                    <Input
                      id="pg-security-officer"
                      value={form.security_officer_name}
                      onChange={(event) =>
                        update("security_officer_name", event.target.value)
                      }
                      disabled={submitting}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TriStateSelect
                      id="pg-has-security-officer"
                      label="Named HIPAA Security Officer"
                      value={form.has_named_security_officer}
                      onChange={(value) =>
                        update("has_named_security_officer", value)
                      }
                      disabled={submitting}
                    />
                    <TriStateSelect
                      id="pg-has-sra"
                      label="SRA completed in last 12 months"
                      value={form.has_recent_sra}
                      onChange={(value) => update("has_recent_sra", value)}
                      disabled={submitting}
                    />
                    <TriStateSelect
                      id="pg-has-policies"
                      label="Existing written HIPAA policies"
                      value={form.has_existing_policies}
                      onChange={(value) => update("has_existing_policies", value)}
                      disabled={submitting}
                    />
                    <TriStateSelect
                      id="pg-has-baa"
                      label="BAA vendor tracking program"
                      value={form.has_baa_program}
                      onChange={(value) => update("has_baa_program", value)}
                      disabled={submitting}
                    />
                    <TriStateSelect
                      id="pg-has-encryption"
                      label="Endpoint encryption deployed"
                      value={form.has_endpoint_encryption}
                      onChange={(value) =>
                        update("has_endpoint_encryption", value)
                      }
                      disabled={submitting}
                    />
                    <TriStateSelect
                      id="pg-has-mfa"
                      label="MFA on ePHI systems"
                      value={form.has_mfa}
                      onChange={(value) => update("has_mfa", value)}
                      disabled={submitting}
                    />
                    <TriStateSelect
                      id="pg-has-ir"
                      label="Incident response procedure"
                      value={form.has_incident_response}
                      onChange={(value) => update("has_incident_response", value)}
                      disabled={submitting}
                    />
                    <TriStateSelect
                      id="pg-has-dr"
                      label="Backup / disaster recovery plan"
                      value={form.has_backup_dr}
                      onChange={(value) => update("has_backup_dr", value)}
                      disabled={submitting}
                    />
                    <TriStateSelect
                      id="pg-has-training"
                      label="Security awareness training (12 mo.)"
                      value={form.has_security_training}
                      onChange={(value) => update("has_security_training", value)}
                      disabled={submitting}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible>
                <CollapsibleTrigger className="text-sm font-medium hover:underline">
                  Policy owners & notes (optional)
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pg-so-role">Security officer role label</Label>
                      <Input
                        id="pg-so-role"
                        value={form.security_officer_role}
                        onChange={(event) =>
                          update("security_officer_role", event.target.value)
                        }
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pg-po-role">Privacy officer role label</Label>
                      <Input
                        id="pg-po-role"
                        value={form.privacy_officer_role}
                        onChange={(event) =>
                          update("privacy_officer_role", event.target.value)
                        }
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="pg-exec-role">Executive approver role</Label>
                      <Input
                        id="pg-exec-role"
                        value={form.executive_approver_role}
                        onChange={(event) =>
                          update("executive_approver_role", event.target.value)
                        }
                        disabled={submitting}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pg-risk-factors">
                      Known risk factors / special circumstances
                    </Label>
                    <textarea
                      id="pg-risk-factors"
                      value={form.known_risk_factors}
                      onChange={(event) =>
                        update("known_risk_factors", event.target.value)
                      }
                      disabled={submitting}
                      rows={3}
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pg-generation-notes">
                      Notes for this policy draft
                    </Label>
                    <textarea
                      id="pg-generation-notes"
                      value={form.generation_notes}
                      onChange={(event) =>
                        update("generation_notes", event.target.value)
                      }
                      placeholder="Emphasize remote workforce, multi-site clinics, etc."
                      disabled={submitting}
                      rows={3}
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {error ? (
            <p role="alert" className="text-destructive mt-4 text-sm">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-border border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting || loadingContext}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => void submit()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Starting…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" aria-hidden />
                Generate draft
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
