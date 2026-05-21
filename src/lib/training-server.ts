import { clerkClient } from "@clerk/nextjs/server";

import type { TrainingRecord } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  TRAINING_TOPICS,
  type TrainingCellStatus,
  type TrainingTopicKey,
  formatTrainingTooltip,
  getTrainingCellStatus,
} from "@/lib/training";

export type TrainingMatrixCell = {
  status: TrainingCellStatus;
  recordId: string | null;
  completedAt: string | null;
  nextDueAt: string | null;
  tooltip: string;
};

export type TrainingMatrixEmployee = {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  jobTitle: string | null;
  cells: Record<TrainingTopicKey, TrainingMatrixCell>;
  allTopicsComplete: boolean;
  certificateRecordId: string | null;
};

export type TrainingBundle = Awaited<ReturnType<typeof loadTrainingBundle>>;

type RosterEntry = {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  jobTitle: string | null;
};

function buildLatestByEmployeeTopic(
  records: TrainingRecord[]
): Map<string, Map<string, TrainingRecord>> {
  const map = new Map<string, Map<string, TrainingRecord>>();
  for (const record of records) {
    let byTopic = map.get(record.employeeId);
    if (!byTopic) {
      byTopic = new Map();
      map.set(record.employeeId, byTopic);
    }
    const existing = byTopic.get(record.trainingTitle);
    if (!existing || record.completedAt > existing.completedAt) {
      byTopic.set(record.trainingTitle, record);
    }
  }
  return map;
}

async function loadOrgMemberRoster(
  organizationId: string,
  clerkOrgId: string
): Promise<RosterEntry[]> {
  const [memberships, prismaMembers] = await Promise.all([
    clerkClient().then((clerk) =>
      clerk.organizations.getOrganizationMembershipList({
        organizationId: clerkOrgId,
        limit: 200,
      })
    ),
    prisma.orgMember.findMany({
      where: { organizationId },
      select: { clerkUserId: true, jobTitle: true },
    }),
  ]);

  const jobTitleByUserId = new Map(
    prismaMembers.map((m) => [m.clerkUserId, m.jobTitle])
  );

  return memberships.data
    .map((m) => {
      const userId = m.publicUserData?.userId ?? "";
      if (!userId) return null;
      const name =
        m.publicUserData?.firstName || m.publicUserData?.lastName
          ? `${m.publicUserData?.firstName ?? ""} ${m.publicUserData?.lastName ?? ""}`.trim()
          : "Unnamed member";
      const email = m.publicUserData?.identifier ?? "";
      if (!email) return null;
      return {
        employeeId: userId,
        employeeName: name,
        employeeEmail: email,
        jobTitle: jobTitleByUserId.get(userId) ?? null,
      };
    })
    .filter((entry): entry is RosterEntry => entry !== null);
}

function buildJobTitleFromRecords(
  records: TrainingRecord[]
): Map<string, string> {
  const byEmployee = new Map<string, { at: Date; title: string }>();
  for (const record of records) {
    const title = record.employeeJobTitle?.trim();
    if (!title) continue;
    const existing = byEmployee.get(record.employeeId);
    if (!existing || record.completedAt > existing.at) {
      byEmployee.set(record.employeeId, {
        at: record.completedAt,
        title,
      });
    }
  }
  return new Map(
    [...byEmployee.entries()].map(([id, { title }]) => [id, title])
  );
}

function mergeRoster(
  orgMembers: RosterEntry[],
  records: TrainingRecord[]
): RosterEntry[] {
  const jobTitleFromRecords = buildJobTitleFromRecords(records);
  const byId = new Map<string, RosterEntry>();
  for (const member of orgMembers) {
    byId.set(member.employeeId, { ...member });
  }
  for (const record of records) {
    if (!byId.has(record.employeeId)) {
      byId.set(record.employeeId, {
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        employeeEmail: record.employeeEmail,
        jobTitle: record.employeeJobTitle?.trim() ?? null,
      });
    }
  }
  for (const [employeeId, entry] of byId) {
    if (!entry.jobTitle) {
      const fromRecord = jobTitleFromRecords.get(employeeId);
      if (fromRecord) entry.jobTitle = fromRecord;
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName)
  );
}

function buildMatrixRow(
  employee: RosterEntry,
  latestByTopic: Map<string, TrainingRecord> | undefined,
  now: Date
): TrainingMatrixEmployee {
  const cells = {} as Record<TrainingTopicKey, TrainingMatrixCell>;
  let completeCount = 0;
  let certificateRecordId: string | null = null;

  for (const topic of TRAINING_TOPICS) {
    const record = latestByTopic?.get(topic.title);
    const status = getTrainingCellStatus(record ?? null, now);
    if (status === "complete") completeCount += 1;
    if (record && !certificateRecordId) {
      certificateRecordId = record.id;
    }
    cells[topic.key] = {
      status,
      recordId: record?.id ?? null,
      completedAt: record?.completedAt.toISOString() ?? null,
      nextDueAt: record?.nextDueAt.toISOString() ?? null,
      tooltip: formatTrainingTooltip(
        status,
        record?.completedAt,
        record?.nextDueAt
      ),
    };
  }

  const allTopicsComplete = completeCount === TRAINING_TOPICS.length;

  return {
    employeeId: employee.employeeId,
    employeeName: employee.employeeName,
    employeeEmail: employee.employeeEmail,
    jobTitle: employee.jobTitle,
    cells,
    allTopicsComplete,
    certificateRecordId: allTopicsComplete ? certificateRecordId : null,
  };
}

export async function loadTrainingBundle(
  organizationId: string,
  clerkOrgId: string
) {
  const now = new Date();
  const records = await prisma.trainingRecord.findMany({
    where: { organizationId },
    orderBy: { completedAt: "desc" },
  });

  const latestMap = buildLatestByEmployeeTopic(records);
  const orgMembers = await loadOrgMemberRoster(organizationId, clerkOrgId);
  const roster = mergeRoster(orgMembers, records);

  const employees = roster.map((employee) =>
    buildMatrixRow(employee, latestMap.get(employee.employeeId), now)
  );

  const totalCells = employees.length * TRAINING_TOPICS.length;
  let completeCells = 0;
  let overdueCells = 0;
  let upcomingCells = 0;

  for (const employee of employees) {
    for (const topic of TRAINING_TOPICS) {
      const status = employee.cells[topic.key].status;
      if (status === "complete") completeCells += 1;
      else if (status === "overdue") overdueCells += 1;
      else if (status === "upcoming") upcomingCells += 1;
    }
  }

  const completionPct =
    totalCells > 0 ? Math.round((completeCells / totalCells) * 100) : 0;

  return {
    meta: { serverTime: now.toISOString() },
    topics: TRAINING_TOPICS.map((t) => ({ key: t.key, title: t.title })),
    employees,
    roster: roster.map((r) => ({
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      employeeEmail: r.employeeEmail,
      jobTitle: r.jobTitle,
    })),
    summary: {
      employeeCount: employees.length,
      completionPct,
      overdueCount: overdueCells,
      upcomingCount: upcomingCells,
      totalCells,
      completeCells,
    },
  };
}
