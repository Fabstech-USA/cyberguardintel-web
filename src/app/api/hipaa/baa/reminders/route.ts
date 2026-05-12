import { startOfDay } from "date-fns";
import { NextResponse } from "next/server";

import { BaaStatus } from "@/generated/prisma";
import { getBaaReminderDay } from "@/lib/baa";
import { writeAuditLogAwait } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

function isAuthorizedInternalRequest(req: Request): boolean {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) return false;

  const header =
    req.headers.get("x-internal-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === expected;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request): Promise<Response> {
  if (!isAuthorizedInternalRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dayStart = startOfDay(now);
  const candidates = await prisma.baaRecord.findMany({
    where: {
      status: { in: [BaaStatus.SIGNED, BaaStatus.EXPIRED] },
      expiresAt: { not: null },
    },
    select: {
      id: true,
      organizationId: true,
      vendorName: true,
      vendorEmail: true,
      services: true,
      status: true,
      expiresAt: true,
      organization: {
        select: {
          name: true,
          billingEmail: true,
        },
      },
    },
  });

  let sent = 0;

  for (const record of candidates) {
    const reminderDay = getBaaReminderDay(record, now);
    if (reminderDay === null) continue;
    if (!record.expiresAt) continue;
    if (!record.organization.billingEmail) continue;

    const alreadySent = await prisma.auditLog.findFirst({
      where: {
        organizationId: record.organizationId,
        resourceId: record.id,
        action: "baa.expiry_reminder_sent",
        createdAt: { gte: dayStart },
      },
      select: { id: true },
    });
    if (alreadySent) continue;

    const vendorName = escapeHtml(record.vendorName);
    const services = escapeHtml(record.services);
    const vendorEmail = escapeHtml(record.vendorEmail ?? "No vendor email recorded");
    const orgName = escapeHtml(record.organization.name);
    const expiresOn = escapeHtml(record.expiresAt.toISOString().slice(0, 10));

    await sendEmail({
      to: record.organization.billingEmail,
      subject:
        reminderDay === 0
          ? `BAA expires today: ${record.vendorName}`
          : `BAA expires in ${reminderDay} days: ${record.vendorName}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>BAA expiry reminder</h2>
          <p>${orgName} has a Business Associate Agreement that ${
            reminderDay === 0 ? "expires today" : `expires in ${reminderDay} days`
          }.</p>
          <ul>
            <li><strong>Vendor:</strong> ${vendorName}</li>
            <li><strong>Vendor email:</strong> ${vendorEmail}</li>
            <li><strong>Services:</strong> ${services}</li>
            <li><strong>Expires on:</strong> ${expiresOn}</li>
          </ul>
          <p>Review the BAA tracker and renew or replace the agreement before the expiration date.</p>
        </div>
      `,
    });

    await writeAuditLogAwait({
      organizationId: record.organizationId,
      actorId: "system",
      action: "baa.expiry_reminder_sent",
      resourceType: "BaaRecord",
      resourceId: record.id,
      metadata: {
        reminderDay,
        vendorName: record.vendorName,
        expiresAt: record.expiresAt.toISOString(),
      },
    });

    sent += 1;
  }

  return NextResponse.json({ ok: true, sent, scanned: candidates.length });
}
