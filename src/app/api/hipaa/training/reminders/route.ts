import { startOfDay } from "date-fns";
import { NextResponse } from "next/server";

import { writeAuditLogAwait } from "@/lib/audit-log";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { buildTrainingReminderEmail } from "@/lib/training-reminder-email";
import {
  getDaysUntilDue,
  getTrainingReminderDay,
  qualifiesForManualTrainingReminder,
} from "@/lib/training";
import { withTenant, type TenantContext } from "@/lib/tenant";

type LatestRecord = {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  trainingTitle: string;
  nextDueAt: Date;
  organization: { name: string };
};

function pickLatestPerCell(
  records: Array<{
    id: string;
    organizationId: string;
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    trainingTitle: string;
    completedAt: Date;
    nextDueAt: Date;
    organization: { name: string };
  }>
): LatestRecord[] {
  const map = new Map<string, (typeof records)[number]>();
  for (const record of records) {
    const key = `${record.organizationId}:${record.employeeId}:${record.trainingTitle}`;
    const existing = map.get(key);
    if (!existing || record.completedAt > existing.completedAt) {
      map.set(key, record);
    }
  }
  return [...map.values()];
}

type ReminderMode = "scheduled" | "manual";

async function sendTrainingReminders(options: {
  organizationId?: string;
  now: Date;
  mode: ReminderMode;
  actorId?: string;
}): Promise<{ sent: number; scanned: number; mode: ReminderMode }> {
  const { now, mode } = options;
  const actorId = options.actorId ?? "system";
  const dayStart = startOfDay(now);
  const auditAction =
    mode === "scheduled"
      ? "training.reminder_sent"
      : "training.manual_reminder_sent";

  const records = await prisma.trainingRecord.findMany({
    where: options.organizationId
      ? { organizationId: options.organizationId }
      : undefined,
    select: {
      id: true,
      organizationId: true,
      employeeId: true,
      employeeName: true,
      employeeEmail: true,
      trainingTitle: true,
      completedAt: true,
      nextDueAt: true,
      organization: { select: { name: true } },
    },
  });

  const latest = pickLatestPerCell(records);
  let sent = 0;

  for (const record of latest) {
    const daysUntilDue = getDaysUntilDue(record.nextDueAt, now);

    if (mode === "scheduled") {
      const reminderDay = getTrainingReminderDay(record, now);
      if (reminderDay === null) continue;

      const alreadySent = await prisma.auditLog.findFirst({
        where: {
          organizationId: record.organizationId,
          resourceId: record.id,
          action: auditAction,
          createdAt: { gte: dayStart },
        },
        select: { id: true },
      });
      if (alreadySent) continue;

      const { subject, html } = buildTrainingReminderEmail({
        organizationName: record.organization.name,
        employeeName: record.employeeName,
        trainingTitle: record.trainingTitle,
        nextDueAt: record.nextDueAt,
        mode: "scheduled",
        reminderDay,
        daysUntilDue,
      });

      await sendEmail({
        to: record.employeeEmail,
        subject,
        html,
      });

      await writeAuditLogAwait({
        organizationId: record.organizationId,
        actorId,
        action: auditAction,
        resourceType: "TrainingRecord",
        resourceId: record.id,
        metadata: {
          mode,
          reminderDay,
          daysUntilDue,
          employeeId: record.employeeId,
          trainingTitle: record.trainingTitle,
          nextDueAt: record.nextDueAt.toISOString(),
        },
      });

      sent += 1;
      continue;
    }

    if (!qualifiesForManualTrainingReminder(record, now)) continue;

    const alreadySent = await prisma.auditLog.findFirst({
      where: {
        organizationId: record.organizationId,
        resourceId: record.id,
        action: auditAction,
        createdAt: { gte: dayStart },
      },
      select: { id: true },
    });
    if (alreadySent) continue;

    const { subject, html } = buildTrainingReminderEmail({
      organizationName: record.organization.name,
      employeeName: record.employeeName,
      trainingTitle: record.trainingTitle,
      nextDueAt: record.nextDueAt,
      mode: "manual",
      daysUntilDue,
    });

    await sendEmail({
      to: record.employeeEmail,
      subject,
      html,
    });

    await writeAuditLogAwait({
      organizationId: record.organizationId,
      actorId,
      action: auditAction,
      resourceType: "TrainingRecord",
      resourceId: record.id,
      metadata: {
        mode,
        daysUntilDue,
        employeeId: record.employeeId,
        trainingTitle: record.trainingTitle,
        nextDueAt: record.nextDueAt.toISOString(),
      },
    });

    sent += 1;
  }

  return { sent, scanned: latest.length, mode };
}

export async function POST(req: Request): Promise<Response> {
  const now = new Date();

  if (isAuthorizedCronRequest(req)) {
    const result = await sendTrainingReminders({ now, mode: "scheduled" });
    return NextResponse.json({ ok: true, ...result });
  }

  return withTenant(async (_request, ctx: TenantContext) => {
    const result = await sendTrainingReminders({
      organizationId: ctx.organizationId,
      now,
      mode: "manual",
      actorId: ctx.clerkUserId,
    });
    return NextResponse.json({ ok: true, ...result });
  })(req);
}
