import { BaaStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { serializeBaaRecord, sortBaaRecords } from "@/lib/baa";

export type BaaTrackerBundle = Awaited<ReturnType<typeof loadBaaTrackerBundle>>;

export async function loadBaaTrackerBundle(organizationId: string) {
  const now = new Date();
  const rows = await prisma.baaRecord.findMany({
    where: { organizationId },
  });

  const records = sortBaaRecords(rows, now).map((row) => {
    const serialized = serializeBaaRecord(row, now);
    return {
      ...serialized,
      signedAt: serialized.signedAt?.toISOString() ?? null,
      expiresAt: serialized.expiresAt?.toISOString() ?? null,
      createdAt: serialized.createdAt.toISOString(),
      updatedAt: serialized.updatedAt.toISOString(),
    };
  });

  const summary = {
    totalVendors: records.length,
    signed: records.filter((row) => row.effectiveStatus === BaaStatus.SIGNED).length,
    pending: records.filter((row) => row.effectiveStatus === BaaStatus.PENDING).length,
    expired: records.filter((row) => row.effectiveStatus === BaaStatus.EXPIRED).length,
    notRequired: records.filter((row) => row.effectiveStatus === BaaStatus.NOT_REQUIRED)
      .length,
    terminated: records.filter((row) => row.effectiveStatus === BaaStatus.TERMINATED)
      .length,
    expiringSoon: records.filter((row) => row.expiryState === "warning").length,
  };

  return {
    meta: { serverTime: now.toISOString() },
    records,
    summary,
  };
}
