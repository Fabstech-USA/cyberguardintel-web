import { z } from "zod";
import { Industry } from "@/generated/prisma";

export const AiPolicyOrgSnapshotSchema = z.object({
  org_name: z.string().min(1),
  industry: z.string().min(1),
  employee_count: z.number().int().nonnegative(),
  entity_type: z.string().min(1),
  tech_stack: z.array(z.string()),
  phi_systems: z.string(),
  existing_controls: z.string(),
});

export type AiPolicyOrgSnapshot = z.infer<typeof AiPolicyOrgSnapshotSchema>;

export const HIPAA_SUBJECT_TYPES = [
  "covered_entity",
  "business_associate",
  "both",
] as const;

export type HipaaSubjectType = (typeof HIPAA_SUBJECT_TYPES)[number];

export const ENTITY_TYPE_LABELS: Record<HipaaSubjectType, string> = {
  covered_entity: "Covered Entity",
  business_associate: "Business Associate",
  both: "Covered Entity and Business Associate",
};

export const INDUSTRY_LABELS: Record<Industry, string> = {
  HEALTHCARE: "Healthcare",
  TECHNOLOGY: "Technology",
  FINANCE: "Finance",
  ECOMMERCE: "E-commerce",
  OTHER: "Other",
};

const INDUSTRY_FROM_LABEL = Object.fromEntries(
  Object.entries(INDUSTRY_LABELS).map(([key, label]) => [label, key])
) as Record<string, Industry>;

/** Optional fields that enrich the CGI provider profile for a single policy run. */
export const AiPolicyOptionalContextSchema = z.object({
  provider_category: z.string().trim().max(200).optional(),
  number_of_locations: z.string().trim().max(100).optional(),
  states_of_operation: z.string().trim().max(300).optional(),
  practice_management_system: z.string().trim().max(200).optional(),
  patient_portal: z.string().trim().max(200).optional(),
  telehealth_platform: z.string().trim().max(200).optional(),
  cloud_storage: z.string().trim().max(200).optional(),
  other_ephi_systems: z.string().trim().max(500).optional(),
  security_officer_name: z.string().trim().max(200).optional(),
  has_named_security_officer: z.boolean().optional(),
  has_recent_sra: z.boolean().optional(),
  has_existing_policies: z.boolean().optional(),
  has_baa_program: z.boolean().optional(),
  has_endpoint_encryption: z.boolean().optional(),
  has_mfa: z.boolean().optional(),
  has_incident_response: z.boolean().optional(),
  has_backup_dr: z.boolean().optional(),
  has_security_training: z.boolean().optional(),
  known_risk_factors: z.string().trim().max(2000).optional(),
  security_officer_role: z.string().trim().max(200).optional(),
  privacy_officer_role: z.string().trim().max(200).optional(),
  executive_approver_role: z.string().trim().max(200).optional(),
  policy_effective_date: z.string().trim().max(80).optional(),
  documentation_retention_start_date: z.string().trim().max(80).optional(),
  generation_notes: z.string().trim().max(2000).optional(),
});

export type AiPolicyOptionalContext = z.infer<
  typeof AiPolicyOptionalContextSchema
>;

export const AiPolicyContextOverridesSchema = AiPolicyOrgSnapshotSchema.partial()
  .extend(AiPolicyOptionalContextSchema.shape);

export type AiPolicyContextOverrides = z.infer<
  typeof AiPolicyContextOverridesSchema
>;

export type PolicyGenerateFormValues = {
  org_name: string;
  industry: Industry;
  hipaaSubjectType: HipaaSubjectType;
  employee_count: number;
  phi_systems: string;
  tech_stack: string;
  existing_controls: string;
  provider_category: string;
  number_of_locations: string;
  states_of_operation: string;
  practice_management_system: string;
  patient_portal: string;
  telehealth_platform: string;
  cloud_storage: string;
  other_ephi_systems: string;
  security_officer_name: string;
  has_named_security_officer: "" | "yes" | "no";
  has_recent_sra: "" | "yes" | "no";
  has_existing_policies: "" | "yes" | "no";
  has_baa_program: "" | "yes" | "no";
  has_endpoint_encryption: "" | "yes" | "no";
  has_mfa: "" | "yes" | "no";
  has_incident_response: "" | "yes" | "no";
  has_backup_dr: "" | "yes" | "no";
  has_security_training: "" | "yes" | "no";
  known_risk_factors: string;
  security_officer_role: string;
  privacy_officer_role: string;
  executive_approver_role: string;
  policy_effective_date: string;
  documentation_retention_start_date: string;
  generation_notes: string;
};

export function emptyPolicyGenerateForm(): PolicyGenerateFormValues {
  return {
    org_name: "",
    industry: Industry.HEALTHCARE,
    hipaaSubjectType: "covered_entity",
    employee_count: 0,
    phi_systems: "",
    tech_stack: "",
    existing_controls: "",
    provider_category: "",
    number_of_locations: "",
    states_of_operation: "",
    practice_management_system: "",
    patient_portal: "",
    telehealth_platform: "",
    cloud_storage: "",
    other_ephi_systems: "",
    security_officer_name: "",
    has_named_security_officer: "",
    has_recent_sra: "",
    has_existing_policies: "",
    has_baa_program: "",
    has_endpoint_encryption: "",
    has_mfa: "",
    has_incident_response: "",
    has_backup_dr: "",
    has_security_training: "",
    known_risk_factors: "",
    security_officer_role: "",
    privacy_officer_role: "",
    executive_approver_role: "",
    policy_effective_date: "",
    documentation_retention_start_date: "",
    generation_notes: "",
  };
}

export function snapshotToPolicyGenerateForm(
  snapshot: AiPolicyOrgSnapshot,
  hipaaSubjectType: HipaaSubjectType | null
): PolicyGenerateFormValues {
  const subject =
    hipaaSubjectType ??
    entityLabelToSubjectType(snapshot.entity_type) ??
    "covered_entity";

  return {
    ...emptyPolicyGenerateForm(),
    org_name: snapshot.org_name,
    industry: INDUSTRY_FROM_LABEL[snapshot.industry] ?? Industry.HEALTHCARE,
    hipaaSubjectType: subject,
    employee_count: snapshot.employee_count,
    phi_systems: snapshot.phi_systems === "None recorded" ? "" : snapshot.phi_systems,
    tech_stack: snapshot.tech_stack.join(", "),
    existing_controls:
      snapshot.existing_controls === "None documented"
        ? ""
        : snapshot.existing_controls,
  };
}

function entityLabelToSubjectType(
  entityType: string
): HipaaSubjectType | null {
  for (const [key, label] of Object.entries(ENTITY_TYPE_LABELS)) {
    if (label === entityType) return key as HipaaSubjectType;
  }
  return null;
}

function parseTechStackInput(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function triStateToBoolean(
  value: "" | "yes" | "no"
): boolean | undefined {
  if (value === "yes") return true;
  if (value === "no") return false;
  return undefined;
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function formValuesToContextOverrides(
  form: PolicyGenerateFormValues
): AiPolicyContextOverrides {
  const overrides: AiPolicyContextOverrides = {
    org_name: form.org_name.trim(),
    industry: INDUSTRY_LABELS[form.industry],
    employee_count: form.employee_count,
    entity_type: ENTITY_TYPE_LABELS[form.hipaaSubjectType],
    phi_systems: optionalString(form.phi_systems),
    tech_stack: parseTechStackInput(form.tech_stack),
    existing_controls: optionalString(form.existing_controls),
    provider_category: optionalString(form.provider_category),
    number_of_locations: optionalString(form.number_of_locations),
    states_of_operation: optionalString(form.states_of_operation),
    practice_management_system: optionalString(form.practice_management_system),
    patient_portal: optionalString(form.patient_portal),
    telehealth_platform: optionalString(form.telehealth_platform),
    cloud_storage: optionalString(form.cloud_storage),
    other_ephi_systems: optionalString(form.other_ephi_systems),
    security_officer_name: optionalString(form.security_officer_name),
    has_named_security_officer: triStateToBoolean(form.has_named_security_officer),
    has_recent_sra: triStateToBoolean(form.has_recent_sra),
    has_existing_policies: triStateToBoolean(form.has_existing_policies),
    has_baa_program: triStateToBoolean(form.has_baa_program),
    has_endpoint_encryption: triStateToBoolean(form.has_endpoint_encryption),
    has_mfa: triStateToBoolean(form.has_mfa),
    has_incident_response: triStateToBoolean(form.has_incident_response),
    has_backup_dr: triStateToBoolean(form.has_backup_dr),
    has_security_training: triStateToBoolean(form.has_security_training),
    known_risk_factors: optionalString(form.known_risk_factors),
    security_officer_role: optionalString(form.security_officer_role),
    privacy_officer_role: optionalString(form.privacy_officer_role),
    executive_approver_role: optionalString(form.executive_approver_role),
    policy_effective_date: optionalString(form.policy_effective_date),
    documentation_retention_start_date: optionalString(
      form.documentation_retention_start_date
    ),
    generation_notes: optionalString(form.generation_notes),
  };

  return Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined)
  ) as AiPolicyContextOverrides;
}

export function mergePolicyGenerationContext(
  snapshot: AiPolicyOrgSnapshot,
  overrides?: AiPolicyContextOverrides
): AiPolicyOrgSnapshot & AiPolicyOptionalContext {
  if (!overrides) {
    return { ...snapshot };
  }

  const merged = {
    ...snapshot,
    ...overrides,
    tech_stack: overrides.tech_stack ?? snapshot.tech_stack,
  };

  return merged;
}
