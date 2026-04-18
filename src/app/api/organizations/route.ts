import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";

const CreateOrgSchema = z.object({
  name: z.string().min(2).max(100),
  industry: z.enum(["HEALTHCARE", "TECHNOLOGY", "FINANCE", "ECOMMERCE", "OTHER"]),
  employeeCount: z.number().int().positive().optional(),
  hipaaSubjectType: z
    .enum(["covered_entity", "business_associate", "both"])
    .optional(),
  billingEmail: z.string().email(),
});

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

    const { name, industry, employeeCount, hipaaSubjectType, billingEmail } =
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

    const org = await prisma.organization.upsert({
      where: { clerkOrgId },
      update: {
        name: normalizedName,
        billingEmail,
        industry,
        employeeCount: employeeCount ?? null,
        hipaaSubjectType: hipaaSubjectType ?? null,
      },
      create: {
        clerkOrgId,
        name: normalizedName,
        slug,
        billingEmail,
        industry,
        employeeCount: employeeCount ?? null,
        hipaaSubjectType: hipaaSubjectType ?? null,
        onboardingStep: 1,
      },
    });

    await prisma.orgMember.upsert({
      where: {
        clerkUserId_organizationId: {
          clerkUserId: userId,
          organizationId: org.id,
        },
      },
      update: {},
      create: {
        clerkUserId: userId,
        organizationId: org.id,
        role: "OWNER",
      },
    });

    writeAuditLog({
      organizationId: org.id,
      actorId: userId,
      action: "org.created",
      resourceType: "Organization",
      resourceId: org.id,
      metadata: { name: normalizedName, industry, billingEmail },
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
