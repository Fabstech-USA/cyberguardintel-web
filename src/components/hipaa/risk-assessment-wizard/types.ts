import type { Industry } from "@/generated/prisma";
import type { WizardControlId } from "@/lib/risk-assessment-controls";

export type HipaaSubjectType = "covered_entity" | "business_associate" | "both";

export type WizardProfile = {
  name: string;
  hipaaSubjectType: HipaaSubjectType;
  employeeCount: number | null;
  industry: Industry;
};

export type WizardPhiSystem = {
  name: string;
  description: string | null;
  systemType: string;
};

export type WizardSubmitPayload = {
  profile: WizardProfile;
  implementedControlIds: WizardControlId[];
};
