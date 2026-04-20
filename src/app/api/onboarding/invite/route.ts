import { z } from "zod";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { withTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { NextResponse } from "next/server";

const InviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(20),
});

export const POST = withTenant(async (req, ctx) => {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "No active org" }, { status: 400 });
  }

  const body: unknown = await req.json();
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const clerk = await clerkClient();
  const results: { email: string; status: string }[] = [];

  for (const email of parsed.data.emails) {
    try {
      await clerk.organizations.createOrganizationInvitation({
        organizationId: orgId,
        emailAddress: email,
        role: "org:member",
        inviterUserId: ctx.clerkUserId,
      });
      results.push({ email, status: "invited" });
    } catch {
      results.push({ email, status: "failed" });
    }
  }

  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: { onboardingStep: 4 },
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "org.members_invited",
    resourceType: "Organization",
    resourceId: ctx.organizationId,
    metadata: { emails: parsed.data.emails, results },
  });

  return NextResponse.json({ results });
});
