import { z } from "zod";
import {
  BaaStatus,
  PhiFlowDataClassification,
  type BaaRecord,
} from "@/generated/prisma";

/** Allowed `PhiSystem.systemType` values for phi-map CRUD (extends onboarding presets). */
export const PHI_MAP_SYSTEM_TYPES = [
  "emr",
  "ehr",
  "database",
  "storage",
  "cloud",
  "communication",
  "vendor",
  "external",
  "deidentified",
  "analytics",
  "other",
  "api",
  "billing",
  "messaging",
] as const;

export type PhiMapSystemType = (typeof PHI_MAP_SYSTEM_TYPES)[number];

export const PhiMapSystemTypeSchema = z.enum(PHI_MAP_SYSTEM_TYPES);

export const PhiSystemCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  systemType: PhiMapSystemTypeSchema,
  description: z.string().trim().max(2000).optional().nullable(),
  containsPhi: z.boolean().optional(),
  phiTypes: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  accessControls: z.string().trim().max(10000).optional().nullable(),
  encryptionAtRest: z.boolean().optional(),
  encryptionInTransit: z.boolean().optional(),
  phiCreates: z.boolean().optional(),
  phiTransmits: z.boolean().optional(),
  phiStores: z.boolean().optional(),
  phiDestroys: z.boolean().optional(),
  baaRecordId: z.string().cuid().optional().nullable(),
});

export const PhiSystemUpdateSchema = PhiSystemCreateSchema.partial().refine(
  (o) => Object.keys(o).length > 0,
  { message: "At least one field required" }
);

export const PhiFlowEdgeCreateSchema = z
  .object({
    sourcePhiSystemId: z.string().cuid(),
    targetPhiSystemId: z.string().cuid().optional().nullable(),
    targetIntegrationId: z.string().cuid().optional().nullable(),
    viaIntegrationId: z.string().cuid().optional().nullable(),
    baaRecordId: z.string().cuid().optional().nullable(),
    isExternalVendorFlow: z.boolean().optional(),
    dataClassification: z.nativeEnum(PhiFlowDataClassification).optional(),
  })
  .superRefine((data, ctx) => {
    const hasSys = Boolean(data.targetPhiSystemId);
    const hasInt = Boolean(data.targetIntegrationId);
    if (hasSys === hasInt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exactly one of targetPhiSystemId or targetIntegrationId is required",
        path: ["targetPhiSystemId"],
      });
    }
  });

export const PhiFlowEdgeUpdateSchema = z
  .object({
    sourcePhiSystemId: z.string().cuid().optional(),
    targetPhiSystemId: z.string().cuid().nullable().optional(),
    targetIntegrationId: z.string().cuid().nullable().optional(),
    viaIntegrationId: z.string().cuid().nullable().optional(),
    baaRecordId: z.string().cuid().nullable().optional(),
    isExternalVendorFlow: z.boolean().optional(),
    dataClassification: z.nativeEnum(PhiFlowDataClassification).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.targetPhiSystemId !== undefined &&
      data.targetIntegrationId !== undefined
    ) {
      const hasSys = data.targetPhiSystemId !== null;
      const hasInt = data.targetIntegrationId !== null;
      if (hasSys === hasInt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Exactly one of targetPhiSystemId or targetIntegrationId must be set",
          path: ["targetPhiSystemId"],
        });
      }
    }
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: "At least one field required",
  });

export function isBaaActive(
  baa: Pick<BaaRecord, "status" | "expiresAt"> | null | undefined,
  now: Date
): boolean {
  if (!baa) return false;
  if (baa.status !== BaaStatus.SIGNED) return false;
  if (baa.expiresAt && baa.expiresAt <= now) return false;
  return true;
}

export function edgeBaaCompliant(
  edge: {
    isExternalVendorFlow: boolean;
    dataClassification: PhiFlowDataClassification;
    baaRecord: Pick<BaaRecord, "status" | "expiresAt"> | null;
  },
  now: Date
): boolean {
  if (edge.dataClassification === PhiFlowDataClassification.DE_IDENTIFIED) {
    return true;
  }
  if (!edge.isExternalVendorFlow) {
    return true;
  }
  return isBaaActive(edge.baaRecord, now);
}

export function edgeIsPhiGap(
  edge: {
    isExternalVendorFlow: boolean;
    dataClassification: PhiFlowDataClassification;
    baaRecord: Pick<BaaRecord, "status" | "expiresAt"> | null;
  },
  now: Date
): boolean {
  if (edge.dataClassification === PhiFlowDataClassification.DE_IDENTIFIED) {
    return false;
  }
  return edge.isExternalVendorFlow && !edgeBaaCompliant(edge, now);
}

export type LegendBucket =
  | "core_phi"
  | "storage"
  | "external_gap"
  | "deidentified";

export function legendBucketForSystem(input: {
  systemType: string;
  containsPhi: boolean;
}): LegendBucket {
  const t = input.systemType.toLowerCase();
  if (t === "deidentified" || t === "analytics") {
    return "deidentified";
  }
  if (
    ["communication", "vendor", "external"].includes(t) &&
    input.containsPhi
  ) {
    return "external_gap";
  }
  if (["database", "storage"].includes(t) || t === "cloud") {
    return "storage";
  }
  if (t === "emr" || t === "ehr") {
    return "core_phi";
  }
  if (input.containsPhi) {
    return "core_phi";
  }
  return "deidentified";
}

export function canMutatePhiMap(orgRole: string): boolean {
  return orgRole !== "AUDITOR";
}
