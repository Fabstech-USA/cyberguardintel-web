import { NextResponse } from "next/server";
import { z } from "zod";
import { ControlStatus } from "@/generated/prisma";

import {
  assignOrgControlOwner,
  ControlOwnerError,
} from "@/lib/hipaa-control-owner";
import { CONTROL_STATUSES } from "@/lib/hipaa-control-status-shared";
import {
  ControlStatusError,
  updateOrgControlStatus,
} from "@/lib/hipaa-control-status";
import { withTenant, type TenantContext } from "@/lib/tenant";

const bodySchema = z
  .object({
    ownerId: z.union([z.string().min(1), z.null()]).optional(),
    status: z.nativeEnum(ControlStatus).optional(),
  })
  .refine(
    (data) => data.ownerId !== undefined || data.status !== undefined,
    { message: "Provide ownerId and/or status" }
  );

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
        { error: "Provide a valid ownerId and/or status" },
        { status: 400 }
      );
    }

    try {
      let result: {
        id: string;
        ownerId: string | null;
        status?: ControlStatus;
        score: number;
      } | null = null;

      if (parsed.data.ownerId !== undefined) {
        result = await assignOrgControlOwner({
          organizationId: ctx.organizationId,
          actorId: ctx.clerkUserId,
          orgRole: ctx.orgRole,
          orgControlId: id,
          ownerId: parsed.data.ownerId,
        });
      }

      if (parsed.data.status !== undefined) {
        if (!CONTROL_STATUSES.includes(parsed.data.status)) {
          return NextResponse.json(
            { error: "Invalid control status" },
            { status: 400 }
          );
        }
        result = await updateOrgControlStatus({
          organizationId: ctx.organizationId,
          actorId: ctx.clerkUserId,
          orgRole: ctx.orgRole,
          orgControlId: id,
          status: parsed.data.status,
        });
      }

      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof ControlOwnerError || err instanceof ControlStatusError) {
        const status =
          err.code === "FORBIDDEN"
            ? 403
            : err.code === "NOT_FOUND"
              ? 404
              : 400;
        return NextResponse.json({ error: err.message }, { status });
      }
      throw err;
    }
  })(req);
}
