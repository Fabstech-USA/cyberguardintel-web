import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assignOrgControlOwner,
  ControlOwnerError,
} from "@/lib/hipaa-control-owner";
import { withTenant, type TenantContext } from "@/lib/tenant";

const bodySchema = z.object({
  ownerId: z.union([z.string().min(1), z.null()]),
});

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(
  req: Request,
  { params }: RouteCtx
): Promise<Response> {
  const { id } = await params;

  return withTenant(async (r, ctx: TenantContext) => {
    let json: unknown;
    try {
      json = await r.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ownerId must be a string or null" },
        { status: 400 }
      );
    }

    try {
      const result = await assignOrgControlOwner({
        organizationId: ctx.organizationId,
        actorId: ctx.clerkUserId,
        orgRole: ctx.orgRole,
        orgControlId: id,
        ownerId: parsed.data.ownerId,
      });
      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof ControlOwnerError) {
        const status =
          err.code === "FORBIDDEN"
            ? 403
            : err.code === "NOT_FOUND"
              ? 404
              : err.code === "INVALID_OWNER"
                ? 400
                : 400;
        return NextResponse.json({ error: err.message }, { status });
      }
      throw err;
    }
  })(req);
}
