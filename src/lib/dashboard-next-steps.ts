/**
 * MVP “Next up” queue — config-driven until workflows are backed by DB state.
 */
export type DashboardNextStep = {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  href: string;
  ctaLabel: string;
};

export const DASHBOARD_NEXT_STEPS: readonly DashboardNextStep[] = [
  {
    id: "risk-assessment",
    order: 1,
    title: "Run your HIPAA risk assessment",
    subtitle: "+18 points · about 10 min",
    href: "/hipaa/risk-assessment",
    ctaLabel: "Start",
  },
  {
    id: "policies",
    order: 2,
    title: "Generate draft policies",
    subtitle: "+22 points · about 15 min",
    href: "/hipaa/policies",
    ctaLabel: "Generate",
  },
  {
    id: "integrations",
    order: 3,
    title: "Connect your first integration",
    subtitle: "+12 points · about 5 min",
    href: "/integrations",
    ctaLabel: "Connect",
  },
  {
    id: "baa",
    order: 4,
    title: "Add vendors that need a BAA",
    subtitle: "+8 points · about 5 min",
    href: "/hipaa/baa-tracker",
    ctaLabel: "Add",
  },
] as const;
