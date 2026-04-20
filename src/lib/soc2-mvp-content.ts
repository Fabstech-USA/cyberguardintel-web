/**
 * SOC 2 “coming soon” MVP — Trust Services Criteria cards (copy from product mock).
 */
export type Soc2TrustCard = {
  letter: string;
  title: string;
  description: string;
};

export const SOC2_TRUST_SERVICE_CARDS: readonly Soc2TrustCard[] = [
  {
    letter: "S",
    title: "Security",
    description:
      "Protection against unauthorized access — the foundation required for all SOC 2 reports.",
  },
  {
    letter: "A",
    title: "Availability",
    description:
      "System uptime, disaster recovery, and operational resilience commitments.",
  },
  {
    letter: "C",
    title: "Confidentiality",
    description:
      "Protecting information classified as confidential from unauthorized disclosure.",
  },
  {
    letter: "P",
    title: "Processing integrity",
    description:
      "System processing is complete, valid, accurate, timely, and authorized.",
  },
  {
    letter: "P",
    title: "Privacy",
    description:
      "Collection, use, retention, and disclosure of personal information.",
  },
] as const;
