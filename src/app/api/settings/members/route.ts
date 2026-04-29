import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { differenceInCalendarDays } from "date-fns";

import { withTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import type { OrgRole } from "@/generated/prisma";
import { mapClerkRoleToOrgRole } from "@/lib/clerk-org-role";
import { getOrganizationInvitationRedirectUrl } from "@/lib/app-url";

type ClerkOrgRole = "org:admin" | "org:member" | "org:auditor";

type InvitationRow = {
  id: string;
  emailAddress: string;
  status: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  url: string | null;
  invitedBy: {
    userId: string;
    name: string | null;
    email: string | null;
    imageUrl: string | null;
  } | null;
  expiresInDays: number | null;
};

type ClerkClientInstance = Awaited<ReturnType<typeof clerkClient>>;

type ClerkOrgQuotaInfo = {
  membersCount: number;
  pendingInvitationsCount: number;
  maxAllowedMemberships: number;
};

function getClerkOrgQuotaInfo(org: unknown): ClerkOrgQuotaInfo {
  if (!isRecord(org)) {
    return { membersCount: 0, pendingInvitationsCount: 0, maxAllowedMemberships: 0 };
  }
  const membersCount = org.membersCount;
  const pendingInvitationsCount = org.pendingInvitationsCount;
  const maxAllowedMemberships = org.maxAllowedMemberships;
  return {
    membersCount: typeof membersCount === "number" ? membersCount : 0,
    pendingInvitationsCount:
      typeof pendingInvitationsCount === "number" ? pendingInvitationsCount : 0,
    maxAllowedMemberships:
      typeof maxAllowedMemberships === "number" ? maxAllowedMemberships : 0,
  };
}

function canManageMembers(role: OrgRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

function canChangeRoles(role: OrgRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

function canActorChangeMemberRole(
  actor: OrgRole,
  targetCurrent: OrgRole,
  targetNext: OrgRole
): boolean {
  if (actor === "OWNER") return true;
  if (actor === "ADMIN") {
    if (targetCurrent === "OWNER" || targetNext === "OWNER") {
      return false;
    }
    return true;
  }
  return false;
}

function mapOrgRoleToClerkRole(role: OrgRole): ClerkOrgRole {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return "org:admin";
    case "AUDITOR":
      return "org:auditor";
    case "MEMBER":
      return "org:member";
    default:
      return role satisfies never;
  }
}

function clerkTimeToDate(ts: number): Date {
  // Clerk org invitation timestamps are ms since epoch, but be defensive in case
  // a seconds-based value is ever present.
  return new Date(ts < 1_000_000_000_000 ? ts * 1000 : ts);
}

function toIso(d: string | number | Date | null | undefined): string {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "number") return clerkTimeToDate(d).toISOString();
  if (typeof d === "string" && d.length > 0) return d;
  return new Date(0).toISOString();
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return Boolean(x) && typeof x === "object";
}

function getStringProp(o: Record<string, unknown>, key: string): string | null {
  const v = o[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function getInviterUserIdFromRecord(o: Record<string, unknown>): string | null {
  const direct =
    getStringProp(o, "inviter_id") ??
    getStringProp(o, "invited_by") ??
    getStringProp(o, "invited_by_id") ??
    getStringProp(o, "invitedById") ??
    getStringProp(o, "invitedByUserId") ??
    getStringProp(o, "invited_by_user_id") ??
    getStringProp(o, "inviterUserId");
  if (direct) return direct;

  const publicInviter = o.public_inviter;
  if (isRecord(publicInviter)) {
    if (typeof publicInviter.user_id === "string" && publicInviter.user_id.length > 0) {
      return publicInviter.user_id;
    }
  }

  const invitedBy = o.invitedBy;
  if (isRecord(invitedBy)) {
    if (typeof invitedBy.id === "string" && invitedBy.id.length > 0) {
      return invitedBy.id;
    }
    if (typeof invitedBy.userId === "string" && invitedBy.userId.length > 0) {
      return invitedBy.userId;
    }
  }

  const ib = o.invited_by;
  if (isRecord(ib)) {
    if (typeof ib.user_id === "string" && ib.user_id.length > 0) {
      return ib.user_id;
    }
    if (typeof ib.id === "string" && ib.id.length > 0) {
      return ib.id;
    }
  }

  return null;
}

function getInviterUserIdFromUnknownInvitation(inv: unknown): string | null {
  if (!isRecord(inv)) return null;
  const direct = getInviterUserIdFromRecord(inv);
  if (direct) return direct;
  // Some Clerk SDKs expose the raw API payload in a `raw` field.
  const raw = inv.raw;
  if (isRecord(raw)) {
    return getInviterUserIdFromRecord(raw);
  }
  return null;
}

function computeExpiresInDays(
  now: Date,
  status: string | undefined,
  expiresAt: Date
): number | null {
  if (!status) return null;
  if (status.toLowerCase() !== "pending") return null;
  return differenceInCalendarDays(expiresAt, now);
}

function coerceClerkTimeToDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return clerkTimeToDate(value);
  }
  if (typeof value === "string" && value.length > 0) {
    if (/^\d+$/.test(value)) {
      const n = Number(value);
      if (Number.isFinite(n)) return clerkTimeToDate(n);
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function readInvitationId(inv: unknown): string | null {
  if (!isRecord(inv)) return null;
  const id = getStringProp(inv, "id");
  return id;
}

function readInvitationEmail(inv: unknown): string {
  if (!isRecord(inv)) return "";
  return (
    getStringProp(inv, "emailAddress") ??
    getStringProp(inv, "email_address") ??
    ""
  );
}

function readInvitationStatus(inv: unknown): string {
  if (!isRecord(inv)) return "unknown";
  return getStringProp(inv, "status") ?? "unknown";
}

function readInvitationRole(inv: unknown): string {
  if (!isRecord(inv)) return "";
  return getStringProp(inv, "role") ?? "";
}

function readInvitationUrl(inv: unknown): string | null {
  if (!isRecord(inv)) return null;
  const u = inv.url;
  if (u === null) return null;
  if (typeof u === "string" && u.length > 0) return u;
  return null;
}

async function buildInvitationRows(
  clerk: ClerkClientInstance,
  invitations: unknown[]
): Promise<InvitationRow[]> {
  const now = new Date();
  const inviters = new Set<string>();
  for (const inv of invitations) {
    const id = getInviterUserIdFromUnknownInvitation(inv);
    if (id) inviters.add(id);
  }
  const invitersById = new Map<
    string,
    { id: string; name: string | null; email: string | null; imageUrl: string | null }
  >();
  await Promise.all(
    Array.from(inviters).map(async (userId) => {
      try {
        const u = await clerk.users.getUser(userId);
        const first = u.firstName ?? "";
        const last = u.lastName ?? "";
        const name =
          first.trim() || last.trim() ? `${first} ${last}`.trim() : null;
        const email =
          u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? null;
        invitersById.set(userId, {
          id: u.id,
          name,
          email,
          imageUrl: u.imageUrl,
        });
      } catch {
        // User may be deleted; leave null in map.
      }
    })
  );

  return invitations.map((inv) => {
    const id = readInvitationId(inv) ?? "";
    const status = readInvitationStatus(inv);
    const role = readInvitationRole(inv);
    const email = readInvitationEmail(inv);

    const created = coerceClerkTimeToDate(
      isRecord(inv) ? inv.createdAt : undefined
    );
    const updated = coerceClerkTimeToDate(
      isRecord(inv) ? inv.updatedAt : undefined
    );
    const expires = coerceClerkTimeToDate(
      isRecord(inv) ? inv.expiresAt : undefined
    );
    const createdAt = (created ?? new Date(0)).toISOString();
    const updatedAt = (updated ?? new Date(0)).toISOString();
    const expiresAt = (expires ?? new Date(0)).toISOString();
    const url = readInvitationUrl(inv);

    const inviterId = getInviterUserIdFromUnknownInvitation(inv);
    const invitedBy = inviterId ? invitersById.get(inviterId) ?? null : null;

    const expiresInDays = expires
      ? computeExpiresInDays(now, status, expires)
      : null;

    return {
      id,
      emailAddress: email,
      status,
      role,
      createdAt,
      updatedAt,
      expiresAt,
      url,
      invitedBy: invitedBy
        ? {
            userId: invitedBy.id,
            name: invitedBy.name,
            email: invitedBy.email,
            imageUrl: invitedBy.imageUrl,
          }
        : null,
      expiresInDays,
    };
  });
}

const InviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(20),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "AUDITOR"]),
});

const ChangeRoleSchema = z.object({
  clerkUserId: z.string().min(1),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "AUDITOR"]),
});

const RemoveMemberSchema = z.object({
  clerkUserId: z.string().min(1),
});

/**
 * If the user is in Clerk for this org but the webhook never created a Prisma row,
 * upsert the row from Clerk so PATCH/DELETE can run (same members list as GET).
 */
async function ensurePrismaOrgMemberForClerkUser(
  clerk: ClerkClientInstance,
  clerkOrgId: string,
  prismaOrgId: string,
  targetClerkUserId: string
): Promise<{ role: OrgRole } | null> {
  const existing = await prisma.orgMember.findUnique({
    where: {
      clerkUserId_organizationId: {
        clerkUserId: targetClerkUserId,
        organizationId: prismaOrgId,
      },
    },
    select: { role: true },
  });
  if (existing) {
    return existing;
  }

  const list = await clerk.organizations.getOrganizationMembershipList({
    organizationId: clerkOrgId,
    userId: [targetClerkUserId],
    limit: 10,
  });
  const m = list.data[0];
  if (!m) {
    return null;
  }
  const role = mapClerkRoleToOrgRole(m.role);
  return prisma.orgMember.upsert({
    where: {
      clerkUserId_organizationId: {
        clerkUserId: targetClerkUserId,
        organizationId: prismaOrgId,
      },
    },
    create: {
      clerkUserId: targetClerkUserId,
      organizationId: prismaOrgId,
      role,
    },
    update: {},
    select: { role: true },
  });
}

export const GET = withTenant(async (_req, ctx): Promise<Response> => {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "No active org" }, { status: 400 });
  }

  const clerk = await clerkClient();

  const [memberships, invitationsResult, prismaMembers, clerkOrg] = await Promise.all([
    clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 200,
    }),
    clerk.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      limit: 200,
    }),
    prisma.orgMember.findMany({
      where: { organizationId: ctx.organizationId },
      select: { clerkUserId: true, role: true },
    }),
    clerk.organizations.getOrganization({ organizationId: orgId }),
  ]);
  const invitationsDataRaw = Array.isArray(invitationsResult)
    ? invitationsResult
    : invitationsResult.data;
  const invitationsData = Array.isArray(invitationsDataRaw) ? invitationsDataRaw : [];

  const roleByClerkUserId = new Map<string, OrgRole>(
    prismaMembers.map((m) => [m.clerkUserId, m.role])
  );

  const userIds = memberships.data
    .map((m) => m.publicUserData?.userId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const users = await Promise.all(
    userIds.map(async (userId) => {
      const u = await clerk.users.getUser(userId);
      return {
        userId: u.id,
        twoFactorEnabled: u.twoFactorEnabled,
      };
    })
  );
  const mfaByUserId = new Map<string, boolean>(
    users.map((u) => [u.userId, u.twoFactorEnabled])
  );

  const members = memberships.data.map((m) => {
    const userId = m.publicUserData?.userId ?? "";
    const appRole =
      roleByClerkUserId.get(userId) ?? mapClerkRoleToOrgRole(m.role);
    const mfaEnabled = userId ? mfaByUserId.get(userId) ?? false : false;

    return {
      clerkUserId: userId,
      email: m.publicUserData?.identifier ?? null,
      name:
        m.publicUserData?.firstName || m.publicUserData?.lastName
          ? `${m.publicUserData?.firstName ?? ""} ${m.publicUserData?.lastName ?? ""}`.trim()
          : null,
      imageUrl: m.publicUserData?.imageUrl ?? null,
      clerkRole: m.role ?? null,
      role: appRole,
      mfaEnabled,
    };
  });

  const anyMemberMissingMfa = members.some((m) => m.clerkUserId && !m.mfaEnabled);

  const invitationRows = await buildInvitationRows(
    clerk,
    invitationsData as unknown[]
  );
  const clerkOrgQuota = getClerkOrgQuotaInfo(clerkOrg);

  return NextResponse.json({
    members,
    invitationRows,
    invitations: invitationRows.map((i) => ({
      id: i.id,
      emailAddress: i.emailAddress,
      status: i.status,
      role: i.role,
      createdAt: i.createdAt,
    })),
    anyMemberMissingMfa,
    currentUserRole: ctx.orgRole,
    clerk: clerkOrgQuota,
  });
});

export const POST = withTenant(async (req, ctx): Promise<Response> => {
  if (!canManageMembers(ctx.orgRole as OrgRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const role = parsed.data.role as OrgRole;
  const clerkRole = mapOrgRoleToClerkRole(role);

  const clerk = await clerkClient();
  const inviteRedirectUrl = getOrganizationInvitationRedirectUrl();
  let invitationsResult: unknown;
  try {
    invitationsResult = await clerk.organizations.createOrganizationInvitationBulk(
      orgId,
      parsed.data.emails.map((email) => ({
        emailAddress: email,
        role: clerkRole,
        inviterUserId: ctx.clerkUserId,
        redirectUrl: inviteRedirectUrl,
        publicMetadata: {
          requestedOrgRole: role,
        },
      }))
    );
  } catch (err) {
    // Clerk dev instances can enforce low membership/invitation quotas.
    // When this happens, return the current outstanding invitations so the UI
    // can still display them.
    const invitationsList = await clerk.organizations.getOrganizationInvitationList(
      { organizationId: orgId, limit: 200 }
    );
    const rawInvs = Array.isArray(invitationsList) ? invitationsList : invitationsList.data;
    const invitationsData = Array.isArray(rawInvs) ? rawInvs : [];
    const clerkOrg = await clerk.organizations.getOrganization({ organizationId: orgId });
    const invitationRows = await buildInvitationRows(
      clerk,
      invitationsData as unknown[]
    );
    const clerkOrgQuota = getClerkOrgQuotaInfo(clerkOrg);

    const message =
      err instanceof Error ? err.message : "Failed to invite members.";
    return NextResponse.json(
      {
        error: message,
        invitationRows,
        invitations: invitationRows.map((i) => ({
          id: i.id,
          emailAddress: i.emailAddress,
          status: i.status,
          role: i.role,
          createdAt: i.createdAt,
        })),
        clerk: clerkOrgQuota,
      },
      { status: 403 }
    );
  }
  const invitations = Array.isArray(invitationsResult)
    ? invitationsResult
    : (invitationsResult as { data?: unknown }).data;
  const invitationsArray =
    Array.isArray(invitations) ? invitations : ([] as typeof invitationsResult extends Array<infer T> ? T[] : unknown[]);

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "org.members_invited",
    resourceType: "Organization",
    resourceId: ctx.organizationId,
    metadata: {
      emails: parsed.data.emails,
      role,
      clerkRole,
      invitationIds: invitationsArray
        .map((i) => (i as { id?: string }).id)
        .filter((id): id is string => typeof id === "string"),
    },
  });

  const invitationRows = await buildInvitationRows(
    clerk,
    invitationsArray as unknown[]
  );

  return NextResponse.json({
    invitationRows,
    invitations: invitationRows.map((i) => ({
      id: i.id,
      emailAddress: i.emailAddress,
      status: i.status,
      role: i.role,
      createdAt: i.createdAt,
    })),
  });
});

export const PATCH = withTenant(async (req, ctx): Promise<Response> => {
  if (!canChangeRoles(ctx.orgRole as OrgRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "No active org" }, { status: 400 });
  }

  const body: unknown = await req.json();
  const parsed = ChangeRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const nextRole = parsed.data.role as OrgRole;

  const clerk = await clerkClient();
  const current = await ensurePrismaOrgMemberForClerkUser(
    clerk,
    orgId,
    ctx.organizationId,
    parsed.data.clerkUserId
  );

  if (!current) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (
    !canActorChangeMemberRole(
      ctx.orgRole as OrgRole,
      current.role,
      nextRole
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Only the organization Owner can assign or change the Owner role.",
      },
      { status: 403 }
    );
  }

  if (current.role === "OWNER" && nextRole !== "OWNER") {
    const ownerCount = await prisma.orgMember.count({
      where: { organizationId: ctx.organizationId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "You must keep at least one Owner in the organization." },
        { status: 400 }
      );
    }
  }

  const clerkRole = mapOrgRoleToClerkRole(nextRole);
  try {
    await clerk.organizations.updateOrganizationMembership({
      organizationId: orgId,
      userId: parsed.data.clerkUserId,
      role: clerkRole,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Clerk rejected the role change.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const updated = await prisma.orgMember.update({
    where: {
      clerkUserId_organizationId: {
        clerkUserId: parsed.data.clerkUserId,
        organizationId: ctx.organizationId,
      },
    },
    data: { role: nextRole },
    select: { clerkUserId: true, role: true },
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "org.member_role_changed",
    resourceType: "OrgMember",
    resourceId: updated.clerkUserId,
    metadata: { from: current.role, to: nextRole, clerkRole },
  });

  return NextResponse.json({ member: updated });
});

export const DELETE = withTenant(async (req, ctx): Promise<Response> => {
  if (!canManageMembers(ctx.orgRole as OrgRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "No active org" }, { status: 400 });
  }

  const body: unknown = await req.json();
  const parsed = RemoveMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const clerk = await clerkClient();
  const target = await ensurePrismaOrgMemberForClerkUser(
    clerk,
    orgId,
    ctx.organizationId,
    parsed.data.clerkUserId
  );
  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (target.role === "OWNER") {
    const ownerCount = await prisma.orgMember.count({
      where: { organizationId: ctx.organizationId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "You can’t remove the last Owner from the organization." },
        { status: 400 }
      );
    }
  }

  await clerk.organizations.deleteOrganizationMembership({
    organizationId: orgId,
    userId: parsed.data.clerkUserId,
  });

  await prisma.orgMember.delete({
    where: {
      clerkUserId_organizationId: {
        clerkUserId: parsed.data.clerkUserId,
        organizationId: ctx.organizationId,
      },
    },
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "org.member_removed",
    resourceType: "OrgMember",
    resourceId: parsed.data.clerkUserId,
    metadata: { role: target.role },
  });

  return NextResponse.json({ ok: true });
});

