export type ProductTourStep = {
  id: string;
  /** Route required before highlighting; omit for any dashboard route */
  route?: string;
  /** Value of data-tour attribute */
  target: string;
  title: string;
  description: string;
};

export const PRODUCT_TOUR_STEPS: readonly ProductTourStep[] = [
  {
    id: "nav-sidebar",
    route: "/dashboard",
    target: "nav-sidebar",
    title: "Your compliance workspace",
    description:
      "Jump between HIPAA, SOC 2, Evidence, Integrations, and Settings from this sidebar.",
  },
  {
    id: "readiness-score",
    route: "/dashboard",
    target: "readiness-score",
    title: "Readiness score",
    description:
      "This live HIPAA readiness score rises as you complete policies, evidence, BAAs, and training.",
  },
  {
    id: "next-up-section",
    route: "/dashboard",
    target: "next-up-section",
    title: "Next up",
    description:
      "Prioritized actions with the biggest impact on your score. Use this as your day-to-day checklist.",
  },
  {
    id: "hipaa-workspace-nav",
    route: "/dashboard",
    target: "hipaa-workspace-nav",
    title: "HIPAA workspace",
    description:
      "Open policies, PHI flow, BAAs, training, and your audit package from these tabs.",
  },
  {
    id: "policies-generate-cta",
    route: "/hipaa/policies",
    target: "policies-generate-cta",
    title: "Policy library",
    description:
      "Generate AI drafts or upload policies you already have to build your required HIPAA library.",
  },
  {
    id: "phi-map-add-system",
    route: "/hipaa/phi-map",
    target: "phi-map-add-system",
    title: "PHI flow map",
    description:
      "Map where protected health information lives and how it moves across your systems.",
  },
  {
    id: "integrations-catalog",
    route: "/integrations",
    target: "integrations-catalog",
    title: "Integrations",
    description:
      "Connect tools to collect compliance evidence automatically. Each maps to HIPAA controls.",
  },
  {
    id: "evidence-upload-cta",
    route: "/evidence",
    target: "evidence-upload-cta",
    title: "Evidence browser",
    description:
      "Browse synced evidence or upload files manually. Every upload is hashed for integrity.",
  },
  {
    id: "header-help",
    target: "header-help",
    title: "Replay anytime",
    description:
      "Reopen this tour from Help whenever you need a refresher.",
  },
] as const;

export function productTourSelector(target: string): string {
  return `[data-tour="${target}"]`;
}
