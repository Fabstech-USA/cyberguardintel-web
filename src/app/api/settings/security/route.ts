import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

export const GET = withTenant(async (_req, ctx) => {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { sessionTimeoutMinutes: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const members = await prisma.orgMember.findMany({
    where: { organizationId: ctx.organizationId },
    select: { clerkUserId: true },
  });

  const clerk = await clerkClient();
  const mfaFlags = await Promise.all(
    members.map(async (member) => {
      try {
        const user = await clerk.users.getUser(member.clerkUserId);
        return {
          clerkUserId: member.clerkUserId,
          enabled: Boolean(user.twoFactorEnabled),
        };
      } catch {
        return { clerkUserId: member.clerkUserId, enabled: false };
      }
    })
  );

  const membersWithMfa = mfaFlags.filter((row) => row.enabled).length;
  const currentUserEnabled =
    mfaFlags.find((row) => row.clerkUserId === ctx.clerkUserId)?.enabled ??
    false;

  const encryptionKeyConfigured = Boolean(
    process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 64
  );

  return NextResponse.json({
    sessionTimeoutMinutes: org.sessionTimeoutMinutes,
    mfa: {
      currentUserEnabled,
      membersWithMfa,
      memberCount: members.length,
    },
    encryption: {
      credentialsAtRest: encryptionKeyConfigured,
      algorithm: "AES-256-GCM",
    },
  });
});
