import { mapClerkRoleToOrgRole } from "@/lib/clerk-org-role";
import { writeAuditLogAwait } from "@/lib/audit-log";
import { ensureOrgControlsForFramework } from "@/lib/ensure-org-framework-controls";
import { generateUniqueSlug } from "@/lib/org-slug";
import { prisma } from "@/lib/prisma";

const SYSTEM_ACTOR = "system";

type ClerkOrgCreatedData = {
  id?: string;
  name?: string;
};

type ClerkOrgRef = {
  id?: string;
  name?: string;
};

type ClerkMembershipData = {
  organization?: ClerkOrgRef;
  public_user_data?: { user_id?: string };
  role?: string;
};

function normalizeOrgName(raw: string | undefined): string {
  const n = (raw?.trim() || "Organization").replace(/\s+/g, " ");
  return n.length > 0 ? n : "Organization";
}

async function provisionHipaaForOrganization(organizationId: string): Promise<void> {
  const hipaa = await prisma.framework.findUnique({
    where: { slug: "HIPAA" },
    select: { id: true },
  });
  if (!hipaa) {
    console.warn(
      "Clerk webhook: HIPAA framework row not found; run `prisma db seed` to enable auto-enroll."
    );
    return;
  }
  await prisma.orgFramework.upsert({
    where: {
      organizationId_frameworkId: {
        organizationId,
        frameworkId: hipaa.id,
      },
    },
    update: {},
    create: {
      organizationId,
      frameworkId: hipaa.id,
    },
  });
  await ensureOrgControlsForFramework({
    organizationId,
    frameworkId: hipaa.id,
    frameworkSlug: "HIPAA",
    actorId: SYSTEM_ACTOR,
  });
}

/**
 * Creates or updates a minimal Organization row from Clerk org fields.
 * Does not overwrite billing, plan, or onboarding step on existing rows (only syncs name).
 */
export async function upsertOrganizationFromClerk(
  clerkOrgId: string,
  nameRaw: string | undefined
): Promise<{ organizationId: string; created: boolean }> {
  const name = normalizeOrgName(nameRaw);
  const prior = await prisma.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });

  if (prior) {
    await prisma.organization.update({
      where: { clerkOrgId },
      data: { name },
    });
    return { organizationId: prior.id, created: false };
  }

  const slug = await generateUniqueSlug(name, clerkOrgId);
  const org = await prisma.organization.create({
    data: {
      clerkOrgId,
      name,
      slug,
      billingEmail: "",
      onboardingStep: 0,
    },
    select: { id: true },
  });
  return { organizationId: org.id, created: true };
}

export async function handleOrganizationCreated(
  data: ClerkOrgCreatedData,
  meta: { eventType: string; svixId: string }
): Promise<void> {
  const clerkOrgId = data.id;
  if (!clerkOrgId) {
    console.error("Clerk webhook: organization.created missing data.id");
    return;
  }

  const { organizationId, created } = await upsertOrganizationFromClerk(
    clerkOrgId,
    data.name
  );

  await provisionHipaaForOrganization(organizationId);

  if (created) {
    await writeAuditLogAwait({
      organizationId,
      actorId: SYSTEM_ACTOR,
      action: "org.provisioned_webhook",
      resourceType: "Organization",
      resourceId: organizationId,
      metadata: {
        clerkEventType: meta.eventType,
        svixId: meta.svixId,
        clerkOrgId,
      },
    });
  }
}

export async function handleOrganizationMembershipCreated(
  data: ClerkMembershipData,
  meta: { eventType: string; svixId: string }
): Promise<void> {
  const extended = data as ClerkMembershipData & {
    organization_id?: string;
    user_id?: string;
  };
  const clerkOrgId = data.organization?.id ?? extended.organization_id;
  const clerkUserId =
    data.public_user_data?.user_id ?? extended.user_id;
  if (!clerkOrgId || !clerkUserId) {
    console.error(
      "Clerk webhook: organizationMembership.created missing organization.id or public_user_data.user_id"
    );
    return;
  }

  const { organizationId, created: orgCreated } = await upsertOrganizationFromClerk(
    clerkOrgId,
    data.organization?.name
  );

  await provisionHipaaForOrganization(organizationId);

  if (orgCreated) {
    await writeAuditLogAwait({
      organizationId,
      actorId: SYSTEM_ACTOR,
      action: "org.provisioned_webhook",
      resourceType: "Organization",
      resourceId: organizationId,
      metadata: {
        clerkEventType: meta.eventType,
        svixId: meta.svixId,
        clerkOrgId,
        source: "organizationMembership.created",
      },
    });
  }

  const existing = await prisma.orgMember.findUnique({
    where: {
      clerkUserId_organizationId: {
        clerkUserId,
        organizationId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  const role = mapClerkRoleToOrgRole(data.role);
  const member = await prisma.orgMember.create({
    data: {
      clerkUserId,
      organizationId,
      role,
    },
    select: { id: true },
  });

  await writeAuditLogAwait({
    organizationId,
    actorId: SYSTEM_ACTOR,
    action: "org.member_added_webhook",
    resourceType: "OrgMember",
    resourceId: member.id,
    metadata: {
      clerkEventType: meta.eventType,
      svixId: meta.svixId,
      clerkOrgId,
      clerkUserId,
      clerkRole: data.role ?? null,
    },
  });
}
