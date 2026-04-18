/**
 * Cleanup orphaned Organization rows.
 *
 * Lists every Prisma `Organization` and checks whether its `clerkOrgId`
 * still exists in Clerk. If the Clerk org is gone (or the user shut down /
 * rotated the Clerk instance), the Prisma row is an orphan and can be
 * safely deleted — it will cascade-delete dependent rows (members, etc.).
 *
 * Usage:
 *   npx tsx prisma/cleanup-orphans.ts            # dry-run, just prints
 *   npx tsx prisma/cleanup-orphans.ts --apply    # actually deletes orphans
 */
import { config as loadEnv } from "dotenv";
import { createClerkClient } from "@clerk/backend";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

// Next.js loads .env.local automatically, but standalone scripts don't.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const apply = process.argv.includes("--apply");

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  console.error("Missing CLERK_SECRET_KEY in environment.");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL in environment.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });
const clerk = createClerkClient({ secretKey });

async function clerkOrgExists(clerkOrgId: string): Promise<boolean> {
  try {
    await clerk.organizations.getOrganization({ organizationId: clerkOrgId });
    return true;
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) return false;
    throw err;
  }
}

async function main(): Promise<void> {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      clerkOrgId: true,
      name: true,
      slug: true,
      onboardingStep: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (orgs.length === 0) {
    console.log("No Organization rows found. Nothing to clean up.");
    return;
  }

  console.log(`Scanning ${orgs.length} Organization row(s)…\n`);

  const orphans: typeof orgs = [];
  for (const org of orgs) {
    const exists = await clerkOrgExists(org.clerkOrgId);
    const status = exists ? "OK " : "ORPHAN";
    console.log(
      `  [${status}] ${org.slug.padEnd(20)} ${org.clerkOrgId}  (step=${org.onboardingStep ?? "done"}, created=${org.createdAt.toISOString()})`
    );
    if (!exists) orphans.push(org);
  }

  if (orphans.length === 0) {
    console.log("\nNo orphans found. ✓");
    return;
  }

  console.log(`\nFound ${orphans.length} orphaned row(s).`);

  if (!apply) {
    console.log("Dry-run (no changes). Re-run with --apply to delete them.");
    return;
  }

  const orphanIds = orphans.map((o) => o.id);
  const { count } = await prisma.organization.deleteMany({
    where: { id: { in: orphanIds } },
  });
  console.log(`Deleted ${count} orphaned Organization row(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
