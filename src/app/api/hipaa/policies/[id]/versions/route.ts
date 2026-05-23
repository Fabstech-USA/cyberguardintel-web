import { NextResponse } from "next/server";
import { FrameworkSlug } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(
  req: Request,
  { params }: RouteCtx
): Promise<Response> {
  const { id } = await params;

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

    const versions = await prisma.policyVersion.findMany({
      where: { policyId: policy.id },
      orderBy: { approvedAt: "desc" },
      select: {
        version: true,
        title: true,
        approvedAt: true,
        approvedById: true,
      },
    });

    return NextResponse.json({ versions });
  })(req);
}
