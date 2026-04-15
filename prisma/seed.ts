import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const frameworks = [
  {
    slug: "HIPAA" as const,
    name: "HIPAA",
    version: "2013 Omnibus Rule",
    description:
      "Health Insurance Portability and Accountability Act — privacy, security, and breach notification rules for protected health information (PHI).",
  },
  {
    slug: "SOC2" as const,
    name: "SOC 2",
    version: "2017 Trust Services Criteria",
    description:
      "Service Organization Control 2 — security, availability, processing integrity, confidentiality, and privacy controls for service organizations.",
  },
  {
    slug: "PCI_DSS" as const,
    name: "PCI DSS",
    version: "v4.0.1",
    description:
      "Payment Card Industry Data Security Standard — requirements for organizations that store, process, or transmit cardholder data.",
  },
  {
    slug: "ISO27001" as const,
    name: "ISO 27001",
    version: "2022",
    description:
      "International standard for information security management systems (ISMS), providing a systematic approach to managing sensitive information.",
  },
  {
    slug: "CMMC" as const,
    name: "CMMC",
    version: "2.0",
    description:
      "Cybersecurity Maturity Model Certification — required for U.S. Department of Defense contractors handling controlled unclassified information (CUI).",
  },
];

async function main(): Promise<void> {
  for (const fw of frameworks) {
    await prisma.framework.upsert({
      where: { slug: fw.slug },
      update: { name: fw.name, version: fw.version, description: fw.description },
      create: { slug: fw.slug, name: fw.name, version: fw.version, description: fw.description },
    });
  }
  console.log(`Seeded ${frameworks.length} frameworks`);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
