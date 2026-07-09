import { EvidenceSource } from "@/generated/prisma";
import {
  DEMO_AWS_ID,
  DEMO_GOOGLE_WORKSPACE_ID,
} from "@/lib/demo-integrations";
import { getCatalogEntry } from "@/lib/integration-catalog";

export type EvidenceSourceBadge = {
  key: string;
  label: string;
  fg: string;
  bg: string;
};

const SOURCE_COLORS: Record<string, { fg: string; bg: string }> = {
  aws: { bg: "#FAEEDA", fg: "#633806" },
  "google-workspace": { bg: "#E6F1FB", fg: "#0C447C" },
  google: { bg: "#E6F1FB", fg: "#0C447C" },
  okta: { bg: "#EEEDFE", fg: "#3C3489" },
  epic: { bg: "#E1F5EE", fg: "#04342C" },
  manual: { bg: "#F1EFE8", fg: "#5F5E5A" },
  ai_generated: { bg: "#EEEDFE", fg: "#534AB7" },
};

const SOURCE_LABEL_OVERRIDES: Record<string, string> = {
  aws: "AWS",
  "google-workspace": "Google",
  google: "Google",
  okta: "Okta",
  epic: "Epic",
  manual: "Manual",
  ai_generated: "AI-generated",
};

type EvidenceSourceInput = {
  sourceType: EvidenceSource;
  integration?: { type: string; displayName: string } | null;
};

export function getEvidenceSourceBadge(
  evidence: EvidenceSourceInput
): EvidenceSourceBadge {
  if (evidence.sourceType === EvidenceSource.MANUAL) {
    const colors = SOURCE_COLORS.manual;
    return { key: "manual", label: "Manual", ...colors };
  }

  if (evidence.sourceType === EvidenceSource.AI_GENERATED) {
    const colors = SOURCE_COLORS.ai_generated;
    return { key: "ai_generated", label: "AI-generated", ...colors };
  }

  const integrationType = evidence.integration?.type ?? "integration";
  const badgeKey =
    integrationType === DEMO_AWS_ID
      ? "aws"
      : integrationType === DEMO_GOOGLE_WORKSPACE_ID
        ? "google-workspace"
        : integrationType;
  const catalogEntry = getCatalogEntry(integrationType);
  const label =
    SOURCE_LABEL_OVERRIDES[badgeKey] ??
    catalogEntry?.name ??
    evidence.integration?.displayName ??
    integrationType;

  const colors =
    SOURCE_COLORS[badgeKey] ??
    (catalogEntry
      ? { bg: catalogEntry.bg, fg: catalogEntry.color }
      : { bg: "#F1EFE8", fg: "#5F5E5A" });

  return {
    key: badgeKey,
    label,
    ...colors,
  };
}

export const EVIDENCE_SOURCE_FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "aws", label: "AWS" },
  { key: "google-workspace", label: "Google" },
  { key: "okta", label: "Okta" },
  { key: "epic", label: "Epic" },
  { key: "manual", label: "Manual" },
  { key: "ai_generated", label: "AI-generated" },
] as const;

/** Primary chip row aligned with evidence browser mockup. */
export const EVIDENCE_SOURCE_CHIP_OPTIONS = EVIDENCE_SOURCE_FILTER_OPTIONS.filter(
  (option) => option.key !== "ai_generated"
);
