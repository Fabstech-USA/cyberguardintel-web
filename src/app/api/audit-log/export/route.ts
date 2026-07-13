import { NextResponse } from "next/server";

import { rowsToCsv } from "@/lib/audit-package";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

const DEFAULT_DAYS = 90;
const MAX_DAYS = 365;

export const GET = withTenant(async (req, ctx) => {
  const url = new URL(req.url);
  const daysParam = Number(url.searchParams.get("days") ?? DEFAULT_DAYS);
  const days =
    Number.isFinite(daysParam) && daysParam > 0
      ? Math.min(Math.floor(daysParam), MAX_DAYS)
      : DEFAULT_DAYS;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      organizationId: ctx.organizationId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 10_000,
    select: {
      id: true,
      actorId: true,
      actorEmail: true,
      action: true,
      resourceType: true,
      resourceId: true,
      ipAddress: true,
      createdAt: true,
    },
  });

  const csv = rowsToCsv(
    [
      "id",
      "actorId",
      "actorEmail",
      "action",
      "resourceType",
      "resourceId",
      "ipAddress",
      "createdAt",
    ],
    auditLogs.map((row) => ({
      id: row.id,
      actorId: row.actorId,
      actorEmail: row.actorEmail,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt.toISOString(),
    }))
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
