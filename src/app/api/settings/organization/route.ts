import { NextResponse } from "next/server";
import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";

import { withTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { Industry, type OrgRole } from "@/generated/prisma";

const HipaaSubjectTypeSchema = z
  .enum(["covered_entity", "business_associate", "both"])
  .nullable()
  .optional();

const PatchOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  billingEmail: z.string().email().optional(),
  employeeCount: z.number().int().positive().nullable().optional(),
  industry: z.nativeEnum(Industry).optional(),
  hipaaSubjectType: HipaaSubjectTypeSchema,
  techStack: z.array(z.string().min(1).max(60)).max(50).optional(),
});

const DeleteOrganizationSchema = z.object({
  confirm: z.string().min(1).max(200),
});

function isOrgAdmin(role: OrgRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export const GET = withTenant(async (_req, ctx): Promise<Response> => {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      id: true,
      clerkOrgId: true,
      name: true,
      slug: true,
      billingEmail: true,
      employeeCount: true,
      industry: true,
      hipaaSubjectType: true,
      techStack: true,
      plan: true,
      planPeriod: true,
      trialEndsAt: true,
    },
  });

  return NextResponse.json({
    organization: org,
    currentUserRole: ctx.orgRole,
  });
});

export const PATCH = withTenant(async (req, ctx): Promise<Response> => {
  if (!isOrgAdmin(ctx.orgRole as OrgRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await req.json();
  const parsed = PatchOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const current = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      id: true,
      clerkOrgId: true,
      name: true,
      billingEmail: true,
      employeeCount: true,
      industry: true,
      hipaaSubjectType: true,
      techStack: true,
    },
  });

  if (!current) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const data = parsed.data;

  const nextName = data.name?.trim().replace(/\s+/g, " ");
  const updateData = {
    ...(nextName !== undefined ? { name: nextName } : {}),
    ...(data.billingEmail !== undefined ? { billingEmail: data.billingEmail } : {}),
    ...(data.employeeCount !== undefined
      ? { employeeCount: data.employeeCount }
      : {}),
    ...(data.industry !== undefined ? { industry: data.industry } : {}),
    ...(data.hipaaSubjectType !== undefined
      ? { hipaaSubjectType: data.hipaaSubjectType }
      : {}),
    ...(data.techStack !== undefined ? { techStack: data.techStack } : {}),
  };

  const updated = await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: updateData,
    select: {
      id: true,
      name: true,
      slug: true,
      billingEmail: true,
      employeeCount: true,
      industry: true,
      hipaaSubjectType: true,
      techStack: true,
    },
  });

  if (nextName && nextName !== current.name) {
    const clerk = await clerkClient();
    await clerk.organizations.updateOrganization(current.clerkOrgId, {
      name: nextName,
    });
  }

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "org.updated",
    resourceType: "Organization",
    resourceId: ctx.organizationId,
    metadata: {
      before: current,
      after: updated,
    },
  });

  return NextResponse.json({ organization: updated });
});

export const DELETE = withTenant(async (req, ctx): Promise<Response> => {
  if (ctx.orgRole !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await req.json();
  const parsed = DeleteOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { id: true, clerkOrgId: true, name: true, slug: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const expected = org.slug;
  if (parsed.data.confirm !== expected) {
    return NextResponse.json(
      { error: `Confirmation text must match "${expected}".` },
      { status: 400 }
    );
  }

  const clerk = await clerkClient();
  await clerk.organizations.deleteOrganization(org.clerkOrgId);

  await prisma.organization.delete({
    where: { id: ctx.organizationId },
  });

  writeAuditLog({
    organizationId: org.id,
    actorId: ctx.clerkUserId,
    action: "org.deleted",
    resourceType: "Organization",
    resourceId: org.id,
    metadata: { name: org.name, slug: org.slug, clerkOrgId: org.clerkOrgId },
  });

  return NextResponse.json({ ok: true });
});

