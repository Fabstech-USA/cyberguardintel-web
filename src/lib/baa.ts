import { z } from "zod";

import { BaaStatus, type BaaRecord } from "@/generated/prisma";

export type BaaBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline";

export type BaaExpiryState = "none" | "ok" | "warning" | "expired";

export const BAA_REMINDER_DAYS = [30, 14, 7, 0] as const;

export const BAA_STATUS_LABELS: Record<BaaStatus, string> = {
  [BaaStatus.PENDING]: "Pending",
  [BaaStatus.SIGNED]: "Signed",
  [BaaStatus.EXPIRED]: "Expired",
  [BaaStatus.NOT_REQUIRED]: "Not required",
  [BaaStatus.TERMINATED]: "Terminated",
};

export type BaaLike = Pick<
  BaaRecord,
  | "id"
  | "vendorName"
  | "vendorEmail"
  | "services"
  | "status"
  | "signedAt"
  | "expiresAt"
  | "documentS3Key"
  | "notes"
  | "createdAt"
  | "updatedAt"
>;

function utcDays(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      86_400_000
  );
}

function emptyStringToNull(value: unknown): unknown {
  return typeof value === "string" && value.trim().length === 0 ? null : value;
}

const NullableTrimmedString = z.preprocess(
  emptyStringToNull,
  z.string().trim().min(1).max(500).nullable().optional()
);

const NullableTextareaString = z.preprocess(
  emptyStringToNull,
  z.string().trim().min(1).max(10_000).nullable().optional()
);

const NullableDate = z.preprocess(
  emptyStringToNull,
  z.coerce.date().nullable().optional()
);

const BaaWriteFields = {
  vendorName: z.string().trim().min(1).max(200),
  vendorEmail: z.preprocess(
    emptyStringToNull,
    z.string().trim().email().max(320).nullable().optional()
  ),
  services: z.string().trim().min(1).max(10_000),
  status: z.nativeEnum(BaaStatus),
  signedAt: NullableDate,
  expiresAt: NullableDate,
  documentS3Key: NullableTrimmedString,
  notes: NullableTextareaString,
} satisfies z.ZodRawShape;

export const BaaCreateSchema = z.object({
  ...BaaWriteFields,
  status: z.nativeEnum(BaaStatus).default(BaaStatus.PENDING),
});

export const BaaUpdateSchema = z.object(BaaWriteFields).partial().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: "At least one field required" }
);

export const BaaTemplateRequestSchema = z.object({
  vendorName: z.string().trim().min(1).max(200),
  vendorEmail: z.preprocess(
    emptyStringToNull,
    z.string().trim().email().max(320).nullable().optional()
  ),
  services: z.string().trim().min(1).max(10_000),
  organizationName: z.string().trim().min(1).max(200),
  hipaaEntityType: z.string().trim().min(1).max(120),
  notes: NullableTextareaString,
});

export const BaaDocumentUploadSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    contentType: z.string().trim().min(1).max(120).optional(),
  })
  .superRefine((value, ctx) => {
    const normalizedType = value.contentType?.toLowerCase();
    const normalizedName = value.fileName.toLowerCase();
    const allowedTypes = new Set([
      "application/pdf",
      "application/x-pdf",
      "application/acrobat",
      "applications/vnd.pdf",
      "text/pdf",
      "text/x-pdf",
      "application/octet-stream",
    ]);

    if (allowedTypes.has(normalizedType ?? "")) return;
    if (normalizedName.endsWith(".pdf")) return;

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Only PDF uploads are supported",
      path: ["contentType"],
    });
  });

export function canMutateBaa(orgRole: string): boolean {
  return orgRole !== "AUDITOR";
}

export function getBaaComputedStatus(
  baa: Pick<BaaRecord, "status" | "expiresAt">,
  now: Date
): BaaStatus {
  if (baa.status === BaaStatus.NOT_REQUIRED) return BaaStatus.NOT_REQUIRED;
  if (baa.status === BaaStatus.TERMINATED) return BaaStatus.TERMINATED;
  if (baa.status === BaaStatus.EXPIRED) return BaaStatus.EXPIRED;
  if (
    baa.status === BaaStatus.SIGNED &&
    baa.expiresAt &&
    utcDays(baa.expiresAt) < utcDays(now)
  ) {
    return BaaStatus.EXPIRED;
  }
  return baa.status;
}

export function getBaaStatusLabel(status: BaaStatus): string {
  return BAA_STATUS_LABELS[status];
}

export function getBaaBadgeVariant(status: BaaStatus): BaaBadgeVariant {
  switch (status) {
    case BaaStatus.SIGNED:
      return "default";
    case BaaStatus.PENDING:
      return "secondary";
    case BaaStatus.EXPIRED:
      return "destructive";
    case BaaStatus.NOT_REQUIRED:
    case BaaStatus.TERMINATED:
      return "outline";
    default:
      return status satisfies never;
  }
}

export function getBaaBadgeClassName(status: BaaStatus): string {
  switch (status) {
    case BaaStatus.SIGNED:
      return "border border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100";
    case BaaStatus.PENDING:
      return "border border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100";
    case BaaStatus.EXPIRED:
      return "";
    case BaaStatus.NOT_REQUIRED:
      return "border border-border bg-background text-muted-foreground";
    case BaaStatus.TERMINATED:
      return "border border-border bg-muted text-muted-foreground";
    default:
      return status satisfies never;
  }
}

export function getDaysUntilExpiry(
  expiresAt: Date | null | undefined,
  now: Date
): number | null {
  if (!expiresAt) return null;
  return utcDays(expiresAt) - utcDays(now);
}

export function getBaaExpiryState(
  baa: Pick<BaaRecord, "status" | "expiresAt">,
  now: Date
): BaaExpiryState {
  const effectiveStatus = getBaaComputedStatus(baa, now);
  if (
    effectiveStatus === BaaStatus.NOT_REQUIRED ||
    effectiveStatus === BaaStatus.TERMINATED
  ) {
    return "none";
  }

  const daysUntilExpiry = getDaysUntilExpiry(baa.expiresAt, now);
  if (daysUntilExpiry === null) return "none";
  if (daysUntilExpiry <= 0) return "expired";
  if (daysUntilExpiry <= 30) return "warning";
  return "ok";
}

export function getBaaReminderDay(
  baa: Pick<BaaRecord, "status" | "expiresAt">,
  now: Date
): (typeof BAA_REMINDER_DAYS)[number] | null {
  if (getBaaComputedStatus(baa, now) !== BaaStatus.SIGNED) return null;
  const daysUntilExpiry = getDaysUntilExpiry(baa.expiresAt, now);
  if (daysUntilExpiry === null) return null;
  return BAA_REMINDER_DAYS.find((day) => day === daysUntilExpiry) ?? null;
}

export function baaSortCompare<T extends Pick<BaaRecord, "vendorName" | "status" | "expiresAt">>(
  a: T,
  b: T,
  now: Date
): number {
  const aState = getBaaExpiryState(a, now);
  const bState = getBaaExpiryState(b, now);
  const aDays = getDaysUntilExpiry(a.expiresAt, now);
  const bDays = getDaysUntilExpiry(b.expiresAt, now);

  const bucket = (state: BaaExpiryState, days: number | null): number => {
    if (state === "expired") return 0;
    if (days !== null) return 1;
    return 2;
  };

  const bucketDiff = bucket(aState, aDays) - bucket(bState, bDays);
  if (bucketDiff !== 0) return bucketDiff;

  if (aDays !== null && bDays !== null && aDays !== bDays) {
    return aDays - bDays;
  }

  if (aDays !== null && bDays === null) return -1;
  if (aDays === null && bDays !== null) return 1;

  return a.vendorName.localeCompare(b.vendorName);
}

export function sortBaaRecords<T extends Pick<BaaRecord, "vendorName" | "status" | "expiresAt">>(
  records: readonly T[],
  now: Date
): T[] {
  return [...records].sort((a, b) => baaSortCompare(a, b, now));
}

export function normalizeBaaWriteInput<
  T extends {
    status?: BaaStatus;
    signedAt?: Date | null;
    expiresAt?: Date | null;
    documentS3Key?: string | null;
  },
>(input: T): T {
  if (input.status !== BaaStatus.NOT_REQUIRED) return input;
  return {
    ...input,
    signedAt: null,
    expiresAt: null,
    documentS3Key: input.documentS3Key ?? null,
  };
}

export function serializeBaaRecord<T extends BaaLike>(record: T, now: Date) {
  const effectiveStatus = getBaaComputedStatus(record, now);
  return {
    ...record,
    effectiveStatus,
    statusLabel: getBaaStatusLabel(effectiveStatus),
    expiryState: getBaaExpiryState(record, now),
    daysUntilExpiry: getDaysUntilExpiry(record.expiresAt, now),
    hasDocument: Boolean(record.documentS3Key),
  };
}
