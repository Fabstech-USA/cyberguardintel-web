import { addYears } from "date-fns";
import { z } from "zod";

import type { TrainingRecord } from "@/generated/prisma";
import { BAA_REMINDER_DAYS } from "@/lib/baa";

export const TRAINING_TOPICS = [
  { key: "hipaa_privacy", title: "HIPAA Privacy" },
  { key: "hipaa_security", title: "HIPAA Security" },
  { key: "phi_handling", title: "PHI Handling" },
  { key: "incident_response", title: "Incident Response" },
  { key: "device_media", title: "Device & Media" },
  { key: "access_control", title: "Access Control" },
] as const;

export type TrainingTopicKey = (typeof TRAINING_TOPICS)[number]["key"];

export const TRAINING_TOPIC_TITLES = TRAINING_TOPICS.map((t) => t.title) as [
  (typeof TRAINING_TOPICS)[number]["title"],
  ...(typeof TRAINING_TOPICS)[number]["title"][],
];

export type TrainingCellStatus =
  | "not_started"
  | "complete"
  | "upcoming"
  | "overdue";

/** Same cadence as BAA expiry reminders: 30, 14, 7, and due-day. */
export const TRAINING_REMINDER_DAYS = BAA_REMINDER_DAYS;

export type TrainingRecordLike = Pick<
  TrainingRecord,
  "completedAt" | "nextDueAt"
>;

function utcDays(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      86_400_000
  );
}

export function getDaysUntilDue(
  nextDueAt: Date,
  now: Date
): number {
  return utcDays(nextDueAt) - utcDays(now);
}

export function computeNextDueAt(completedAt: Date): Date {
  return addYears(completedAt, 1);
}

export function getTrainingCellStatus(
  record: TrainingRecordLike | null | undefined,
  now: Date
): TrainingCellStatus {
  if (!record) return "not_started";

  const daysUntilDue = getDaysUntilDue(record.nextDueAt, now);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 30) return "upcoming";
  return "complete";
}

export function formatTrainingTooltip(
  status: TrainingCellStatus,
  completedAt: Date | null | undefined,
  nextDueAt: Date | null | undefined
): string {
  if (status === "not_started") return "Not started";

  const completed = completedAt
    ? completedAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const due = nextDueAt
    ? nextDueAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  if (status === "complete") {
    return `Completed ${completed} · Due ${due}`;
  }
  if (status === "overdue") {
    return `OVERDUE · Was due ${due}`;
  }
  return `Due ${due}`;
}

export function getTrainingReminderDay(
  record: Pick<TrainingRecord, "nextDueAt">,
  now: Date
): (typeof TRAINING_REMINDER_DAYS)[number] | null {
  const daysUntilDue = getDaysUntilDue(record.nextDueAt, now);
  return TRAINING_REMINDER_DAYS.find((day) => day === daysUntilDue) ?? null;
}

/** Manual “Send reminders”: upcoming (≤30 days) and overdue rows. */
export function qualifiesForManualTrainingReminder(
  record: Pick<TrainingRecord, "nextDueAt">,
  now: Date
): boolean {
  const daysUntilDue = getDaysUntilDue(record.nextDueAt, now);
  return daysUntilDue <= 30;
}

export type TrainingReminderUrgency = "overdue" | "upcoming" | "due_today";

export function getManualTrainingReminderUrgency(
  record: Pick<TrainingRecord, "nextDueAt">,
  now: Date
): TrainingReminderUrgency {
  const daysUntilDue = getDaysUntilDue(record.nextDueAt, now);
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue === 0) return "due_today";
  return "upcoming";
}

export function isCanonicalTrainingTitle(title: string): boolean {
  return TRAINING_TOPIC_TITLES.includes(
    title as (typeof TRAINING_TOPIC_TITLES)[number]
  );
}

export function canMutateTraining(orgRole: string): boolean {
  return orgRole !== "AUDITOR";
}

function emptyStringToNull(value: unknown): unknown {
  return typeof value === "string" && value.trim().length === 0 ? null : value;
}

const NullableJobTitle = z.preprocess(
  emptyStringToNull,
  z.string().trim().min(1).max(120).nullable().optional()
);

const TrainingRecordCreateFields = {
  employeeId: z.string().trim().min(1).max(200),
  employeeName: z.string().trim().min(1).max(200),
  employeeEmail: z.string().trim().email().max(320),
  employeeJobTitle: NullableJobTitle,
  trainingTitle: z.enum(TRAINING_TOPIC_TITLES),
  completedAt: z.coerce.date().optional(),
};

export const TrainingRecordCreateSchema = z.object(TrainingRecordCreateFields);

export const TrainingBulkCreateSchema = z.object({
  records: z.array(TrainingRecordCreateSchema).min(1).max(200),
});

export const TrainingRecordUpdateSchema = z
  .object({
    employeeId: z.string().trim().min(1).max(200).optional(),
    employeeName: z.string().trim().min(1).max(200).optional(),
    employeeEmail: z.string().trim().email().max(320).optional(),
    employeeJobTitle: NullableJobTitle,
    trainingTitle: z.enum(TRAINING_TOPIC_TITLES).optional(),
    completedAt: z.coerce.date().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field required",
  });

export type TrainingRecordCreateInput = z.infer<typeof TrainingRecordCreateSchema>;
export type TrainingBulkCreateInput = z.infer<typeof TrainingBulkCreateSchema>;
export type TrainingRecordUpdateInput = z.infer<typeof TrainingRecordUpdateSchema>;

export function normalizeTrainingCreateInput(
  input: TrainingRecordCreateInput
): Required<Pick<TrainingRecordCreateInput, "completedAt">> &
  Omit<TrainingRecordCreateInput, "completedAt"> {
  return {
    ...input,
    completedAt: input.completedAt ?? new Date(),
  };
}
