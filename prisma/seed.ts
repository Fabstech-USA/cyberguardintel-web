import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const seedDir = dirname(fileURLToPath(import.meta.url));

type HipaaControlCatalog = {
  controls: Array<{
    controlRef: string;
    title: string;
    category: string;
    isRequired: boolean;
    description: string;
    guidance: string;
    evidenceHints: string;
  }>;
};

function loadHipaaControlCatalog(): HipaaControlCatalog {
  const path = join(seedDir, "data/hipaa-security-rule-controls-3.json");
  return JSON.parse(readFileSync(path, "utf8")) as HipaaControlCatalog;
}

const frameworks = [
  {
    slug: "HIPAA" as const,
    name: "HIPAA",
    version: "2013 Omnibus Rule",
    description:
      "HIPAA Security Standards for electronic PHI (45 CFR Part 164 Subpart C): administrative, physical, and technical safeguards, organizational requirements, and documentation. Privacy Rule, Breach Notification, and Enforcement are tracked separately in product scope.",
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

  const hipaa = await prisma.framework.findUniqueOrThrow({ where: { slug: "HIPAA" } });
  const catalog = loadHipaaControlCatalog();

  for (const row of catalog.controls) {
    await prisma.frameworkControl.upsert({
      where: {
        frameworkId_controlRef: { frameworkId: hipaa.id, controlRef: row.controlRef },
      },
      create: {
        frameworkId: hipaa.id,
        controlRef: row.controlRef,
        category: row.category,
        title: row.title,
        description: row.description,
        guidance: row.guidance,
        evidenceHints: row.evidenceHints,
        isRequired: row.isRequired,
      },
      update: {
        category: row.category,
        title: row.title,
        description: row.description,
        guidance: row.guidance,
        evidenceHints: row.evidenceHints,
        isRequired: row.isRequired,
      },
    });
  }
  console.log(`Seeded ${catalog.controls.length} HIPAA framework controls`);

  const controls = await prisma.frameworkControl.findMany({
    where: { frameworkId: hipaa.id },
    select: { id: true },
  });
  const enrollments = await prisma.orgFramework.findMany({
    where: { frameworkId: hipaa.id },
    select: { organizationId: true },
  });
  let orgControlsCreated = 0;
  for (const { organizationId } of enrollments) {
    const batch = await prisma.orgControl.createMany({
      data: controls.map((c) => ({
        organizationId,
        frameworkControlId: c.id,
      })),
      skipDuplicates: true,
    });
    orgControlsCreated += batch.count;
  }
  console.log(
    `Synced HIPAA OrgControl rows for ${enrollments.length} org(s) (${orgControlsCreated} new row(s) this run)`
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
