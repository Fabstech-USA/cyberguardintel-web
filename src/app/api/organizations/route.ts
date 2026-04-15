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
  const { userId } = await auth();
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

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const clerk = await clerkClient();

  const clerkOrg = await clerk.organizations.createOrganization({
    name,
    createdBy: userId,
  });

  const org = await prisma.organization.create({
    data: {
      clerkOrgId: clerkOrg.id,
      name,
      slug,
      billingEmail,
      industry,
      employeeCount: employeeCount ?? null,
      hipaaSubjectType: hipaaSubjectType ?? null,
      onboardingStep: 1,
    },
  });

  await prisma.orgMember.create({
    data: {
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
    metadata: { name, industry, billingEmail },
  });

  return NextResponse.json({ id: org.id, clerkOrgId: clerkOrg.id });
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
