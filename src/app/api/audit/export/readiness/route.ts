import { NextResponse } from "next/server";

import { getAuditPackageReadiness } from "@/lib/audit-package-readiness";
import { withTenant } from "@/lib/tenant";

function parseBoundaryDate(raw: string, endOfDay: boolean): Date | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
    const d = new Date(`${raw}${suffix}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const GET = withTenant(async (req, ctx) => {
  const url = new URL(req.url);
  const fromRaw = url.searchParams.get("from")?.trim() ?? "";
  const toRaw = url.searchParams.get("to")?.trim() ?? "";

  const from = parseBoundaryDate(fromRaw, false);
  const to = parseBoundaryDate(toRaw, true);

  if (!from || !to) {
    return NextResponse.json(
      { error: "`from` and `to` query params are required" },
      { status: 400 }
    );
  }
  if (from > to) {
    return NextResponse.json(
      { error: "`from` must be on or before `to`" },
      { status: 400 }
    );
  }

  const readiness = await getAuditPackageReadiness({
    organizationId: ctx.organizationId,
    from,
    to,
  });

  // Always emit explicit short counts for the checklist UI.
  return NextResponse.json(
    {
      ...readiness,
      sections: readiness.sections.map((section) => ({
        id: section.id,
        label: section.label,
        state: section.state,
        count: section.count,
        reason: section.reason,
        ...(section.id === "phi_map"
          ? {
              systemCount: section.systemCount ?? 0,
              edgeCount: section.edgeCount ?? 0,
            }
          : {}),
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
});
