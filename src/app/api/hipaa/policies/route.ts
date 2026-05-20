import { NextResponse } from "next/server";
import { z } from "zod";
import {
  FrameworkSlug,
  PolicyStatus,
  PolicyType,
} from "@/generated/prisma";
import {
  filterMergedRows,
  mergePoliciesWithCatalog,
  summarizePolicyRows,
  type PolicyUiStatus,
} from "@/lib/hipaa-policy-catalog";
import { canManageHipaaPolicies } from "@/lib/hipaa-policy-access";
import { upsertHipaaPolicyDraftManual } from "@/lib/hipaa-policy-persist";
import { prisma } from "@/lib/prisma";
import { SAFEGUARD_BUCKETS, type SafeguardBucket } from "@/lib/dashboard-safeguards";
import { withTenant } from "@/lib/tenant";

const STATUS_VALUES = [
  "NOT_STARTED",
  PolicyStatus.APPROVED,
  PolicyStatus.UNDER_REVIEW,
  PolicyStatus.DRAFT,
  PolicyStatus.ARCHIVED,
] as const;

function parseStatusFilter(v: string | null): PolicyUiStatus | "" {
  if (!v) return "";
  if (STATUS_VALUES.includes(v as (typeof STATUS_VALUES)[number])) {
    return v as PolicyUiStatus;
  }
  return "";
}

function parseSafeguardFilter(v: string | null): SafeguardBucket | "" {
  if (!v) return "";
  if ((SAFEGUARD_BUCKETS as readonly string[]).includes(v)) {
    return v as SafeguardBucket;
  }
  return "";
}

const PersistBodySchema = z.object({
  policy_type: z.nativeEnum(PolicyType),
  title: z.string().trim().min(1).max(500),
  content: z.string().min(10),
  cited_cfr_sources: z.array(z.string()).optional(),
  ai_generated: z.boolean().optional().default(true),
});

export const GET = withTenant(async (req, ctx): Promise<Response> => {
  const url = new URL(req.url);
  const statusFilter = parseStatusFilter(url.searchParams.get("status"));
  const safeguardFilter = parseSafeguardFilter(
    url.searchParams.get("safeguard")
  );

  const policies = await prisma.policy.findMany({
    where: {
      organizationId: ctx.organizationId,
      frameworkSlug: FrameworkSlug.HIPAA,
    },
    select: {
      id: true,
      type: true,
      title: true,
      status: true,
      version: true,
      updatedAt: true,
      reviewDate: true,
      aiGenerated: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const merged = mergePoliciesWithCatalog(policies);
  const filtered = filterMergedRows(merged, {
    status: statusFilter || undefined,
    safeguard: safeguardFilter || undefined,
  });
  const summary = summarizePolicyRows(merged);

  return NextResponse.json({
    rows: filtered,
    summary,
    allRows: merged,
    canManagePolicies: canManageHipaaPolicies(ctx.orgRole),
  });
});

export const POST = withTenant(async (req, ctx): Promise<Response> => {
  if (!canManageHipaaPolicies(ctx.orgRole)) {
    return NextResponse.json(
      { error: "Only owners or admins can save policies." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = PersistBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const row = await upsertHipaaPolicyDraftManual({
    organizationId: ctx.organizationId,
    clerkUserId: ctx.clerkUserId,
    policyType: parsed.data.policy_type,
    title: parsed.data.title,
    content: parsed.data.content,
    cited_cfr_sources: parsed.data.cited_cfr_sources,
    aiGenerated: parsed.data.ai_generated,
  });

  return NextResponse.json({ policy: row }, { status: 201 });
});
