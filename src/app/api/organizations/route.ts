import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { addDays } from "date-fns";
import { ensureOrgControlsForFramework } from "@/lib/ensure-org-framework-controls";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";

const CreateOrgSchema = z.object({
  name: z.string().min(2).max(100),
  billingEmail: z.string().email(),
  employeeCount: z.number().int().positive().optional(),
  jobTitle: z.string().min(1).max(100).optional(),
  // Plan + period arrive from the (client-only) Plan step via sessionStorage
  // and get persisted atomically here so we never create a zombie org without
  // a plan. Optional so the endpoint still works if the client re-runs the
  // wizard (activeOrg path) without a fresh plan pick.
  plan: z.enum(["STARTER", "GROWTH", "BUSINESS", "ENTERPRISE"]).optional(),
  period: z.enum(["MONTHLY", "ANNUAL"]).optional(),
});

const TRIAL_DAYS = 14;

// Onboarding step the org advances to *after* Step 1/4 (Org details) succeeds.
// Matches the wizard's internal index for the HIPAA role step (Step 2/4).
const STEP_AFTER_ORG_DETAILS = 3;

export async function POST(req: Request): Promise<Response> {
  try {
    const { userId, orgId: activeOrgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();
    const parsed = CreateOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, billingEmail, employeeCount, jobTitle, plan, period } =
      parsed.data;

    const normalizedName = name.trim().replace(/\s+/g, " ");

    // Block duplicate names (case-insensitive) owned by a *different* user,
    // so co-workers from the same company don't accidentally spin up parallel
    // tenants. Re-runs by the same user (already a member) fall through so
    // the wizard can idempotently finish setup.
    const nameMatches = await prisma.organization.findMany({
      where: { name: { equals: normalizedName, mode: "insensitive" } },
      select: {
        name: true,
        members: {
          where: { clerkUserId: userId },
          select: { id: true },
        },
      },
    });

    const conflict = nameMatches.find((o) => o.members.length === 0);
    if (conflict) {
      return NextResponse.json(
        {
          error: `An organization named "${conflict.name}" already exists. If you're part of this organization, please ask an administrator to invite you. Otherwise, try a different name.`,
        },
        { status: 409 }
      );
    }

    const clerk = await clerkClient();

    // Reuse the Clerk org already attached to the session (common when a
    // previous onboarding attempt created a Clerk org but failed to persist
    // the Prisma row, or when the user is re-running the wizard). Otherwise,
    // fall back to an existing membership, and only create a fresh Clerk
    // org when the user truly has none.
    let clerkOrgId: string;
    if (activeOrgId) {
      const existing = await clerk.organizations.updateOrganization(
        activeOrgId,
        { name: normalizedName }
      );
      clerkOrgId = existing.id;
    } else {
      const memberships = await clerk.users.getOrganizationMembershipList({
        userId,
        limit: 1,
      });
      const existingMembership = memberships.data[0];
      if (existingMembership) {
        const existing = await clerk.organizations.updateOrganization(
          existingMembership.organization.id,
          { name: normalizedName }
        );
        clerkOrgId = existing.id;
      } else {
        const created = await clerk.organizations.createOrganization({
          name: normalizedName,
          createdBy: userId,
        });
        clerkOrgId = created.id;
      }
    }

    // Slug is globally unique, so we pick one that isn't already taken by
    // another org. Slug is only set on create; renaming the org later won't
    // churn the slug (and risk a collision).
    const slug = await generateUniqueSlug(normalizedName, clerkOrgId);

    // Preserve an existing trialEndsAt (rerun of the wizard) so users can't
    // game a fresh 14 days by bouncing back through Plan.
    const existing = await prisma.organization.findUnique({
      where: { clerkOrgId },
      select: { trialEndsAt: true },
    });

    const trialEndsAt =
      existing?.trialEndsAt ?? (plan ? addDays(new Date(), TRIAL_DAYS) : null);

    const org = await prisma.organization.upsert({
      where: { clerkOrgId },
      update: {
        name: normalizedName,
        billingEmail,
        employeeCount: employeeCount ?? null,
        // Only overwrite plan/period when the client sent a fresh pick;
        // a bare re-submit shouldn't clobber a prior selection.
        ...(plan ? { plan } : {}),
        ...(period ? { planPeriod: period } : {}),
        ...(trialEndsAt ? { trialEndsAt } : {}),
        onboardingStep: STEP_AFTER_ORG_DETAILS,
      },
      create: {
        clerkOrgId,
        name: normalizedName,
        slug,
        billingEmail,
        employeeCount: employeeCount ?? null,
        plan: plan ?? "STARTER",
        planPeriod: period ?? "MONTHLY",
        trialEndsAt,
        onboardingStep: STEP_AFTER_ORG_DETAILS,
      },
    });

    await prisma.orgMember.upsert({
      where: {
        clerkUserId_organizationId: {
          clerkUserId: userId,
          organizationId: org.id,
        },
      },
      update: jobTitle ? { jobTitle } : {},
      create: {
        clerkUserId: userId,
        organizationId: org.id,
        role: "OWNER",
        jobTitle: jobTitle ?? null,
      },
    });

    // MVP ships with HIPAA as the only framework, so auto-enroll on org
    // create instead of making the user pick from a single-option list.
    const hipaa = await prisma.framework.findUnique({
      where: { slug: "HIPAA" },
      select: { id: true },
    });
    if (hipaa) {
      await prisma.orgFramework.upsert({
        where: {
          organizationId_frameworkId: {
            organizationId: org.id,
            frameworkId: hipaa.id,
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          frameworkId: hipaa.id,
        },
      });
      await ensureOrgControlsForFramework({
        organizationId: org.id,
        frameworkId: hipaa.id,
        frameworkSlug: "HIPAA",
        actorId: userId,
      });
    } else {
      console.warn(
        "HIPAA framework row not found; run `prisma db seed` to enable auto-enroll."
      );
    }

    writeAuditLog({
      organizationId: org.id,
      actorId: userId,
      action: "org.created",
      resourceType: "Organization",
      resourceId: org.id,
      metadata: {
        name: normalizedName,
        billingEmail,
        plan: plan ?? null,
        period: period ?? null,
      },
    });

    return NextResponse.json({ id: org.id, clerkOrgId });
  } catch (err) {
    console.error("POST /api/organizations failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create organization";
    return NextResponse.json(
      { error: "Something went wrong creating the organization.", detail: message },
      { status: 500 }
    );
  }
}

function slugify(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.length > 0 ? cleaned.slice(0, 48) : "org";
}

async function generateUniqueSlug(
  name: string,
  clerkOrgId: string
): Promise<string> {
  const base = slugify(name);

  const taken = await prisma.organization.findMany({
    where: {
      slug: { startsWith: base },
      NOT: { clerkOrgId },
    },
    select: { slug: true },
  });
  const usedSlugs = new Set(taken.map((o) => o.slug));

  if (!usedSlugs.has(base)) return base;

  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base}-${i}`;
    if (!usedSlugs.has(candidate)) return candidate;
  }

  // Fall back to a random suffix in the (extremely unlikely) case the first
  // 99 numeric variants are all taken.
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(): Promise<Response> {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!orgId) {
    return NextResponse.json({ organization: null });
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      employeeCount: true,
      hipaaSubjectType: true,
      billingEmail: true,
      onboardingStep: true,
    },
  });

  return NextResponse.json({ organization: org });
}
