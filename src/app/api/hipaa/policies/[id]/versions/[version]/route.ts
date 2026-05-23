import { NextResponse } from "next/server";
import { FrameworkSlug } from "@/generated/prisma";
import { parsePolicyVersionParam } from "@/lib/policy-version-param";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string; version: string }> };

export async function GET(
  req: Request,
  { params }: RouteCtx
): Promise<Response> {
  const { id, version: versionParam } = await params;
  const version = parsePolicyVersionParam(versionParam);

  if (version == null) {
    return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  }

  return withTenant(async (_r, ctx) => {
    const policy = await prisma.policy.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
        frameworkSlug: FrameworkSlug.HIPAA,
      },
      select: { id: true },
    });

    if (!policy) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const snapshot = await prisma.policyVersion.findUnique({
      where: {
        policyId_version: {
          policyId: policy.id,
          version,
        },
      },
      select: {
        version: true,
        title: true,
        content: true,
        approvedAt: true,
        approvedById: true,
      },
    });

    if (!snapshot) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    return NextResponse.json({ version: snapshot });
  })(req);
}
