import { describe, expect, it } from "vitest";

import {
  TrainingBulkCreateSchema,
  qualifiesForManualTrainingReminder,
  TrainingRecordCreateSchema,
  TrainingRecordUpdateSchema,
  computeNextDueAt,
  getTrainingCellStatus,
  getTrainingReminderDay,
} from "@/lib/training";

describe("TrainingRecordCreateSchema", () => {
  it("accepts a minimal payload", () => {
    const result = TrainingRecordCreateSchema.safeParse({
      employeeId: "user_abc",
      employeeName: "Jane Doe",
      employeeEmail: "jane@example.com",
      trainingTitle: "HIPAA Privacy",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown training titles", () => {
    const result = TrainingRecordCreateSchema.safeParse({
      employeeId: "user_abc",
      employeeName: "Jane Doe",
      employeeEmail: "jane@example.com",
      trainingTitle: "Unknown Topic",
    });
    expect(result.success).toBe(false);
  });
});

describe("TrainingBulkCreateSchema", () => {
  it("accepts multiple records", () => {
    const result = TrainingBulkCreateSchema.safeParse({
      records: [
        {
          employeeId: "user_abc",
          employeeName: "Jane Doe",
          employeeEmail: "jane@example.com",
          trainingTitle: "HIPAA Privacy",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("TrainingRecordUpdateSchema", () => {
  it("rejects an empty patch body", () => {
    const result = TrainingRecordUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("computeNextDueAt", () => {
  it("adds one year to completedAt", () => {
    const completedAt = new Date("2026-03-12T12:00:00Z");
    const nextDueAt = computeNextDueAt(completedAt);
    expect(nextDueAt.toISOString().slice(0, 10)).toBe("2027-03-12");
  });
});

describe("getTrainingCellStatus", () => {
  const record = {
    completedAt: new Date("2026-01-01T00:00:00Z"),
    nextDueAt: new Date("2027-01-01T00:00:00Z"),
  };

  it("returns not_started when record is missing", () => {
    expect(getTrainingCellStatus(null, new Date("2026-05-01T00:00:00Z"))).toBe(
      "not_started"
    );
  });

  it("returns complete when due date is more than 30 days away", () => {
    expect(
      getTrainingCellStatus(record, new Date("2026-05-01T00:00:00Z"))
    ).toBe("complete");
  });

  it("returns upcoming when due within 30 days", () => {
    expect(
      getTrainingCellStatus(record, new Date("2026-12-15T00:00:00Z"))
    ).toBe("upcoming");
  });

  it("returns overdue when past due", () => {
    expect(
      getTrainingCellStatus(record, new Date("2027-02-01T00:00:00Z"))
    ).toBe("overdue");
  });
});

describe("getTrainingReminderDay", () => {
  it("returns 30 exactly 30 days before nextDueAt", () => {
    const nextDueAt = new Date("2027-06-01T00:00:00Z");
    const now = new Date("2027-05-02T00:00:00Z");
    expect(getTrainingReminderDay({ nextDueAt }, now)).toBe(30);
  });

  it("returns 14, 7, and 0 on BAA-aligned reminder days", () => {
    const nextDueAt = new Date("2027-06-15T00:00:00Z");
    expect(getTrainingReminderDay({ nextDueAt }, new Date("2027-06-01T00:00:00Z"))).toBe(
      14
    );
    expect(getTrainingReminderDay({ nextDueAt }, new Date("2027-06-08T00:00:00Z"))).toBe(
      7
    );
    expect(getTrainingReminderDay({ nextDueAt }, new Date("2027-06-15T00:00:00Z"))).toBe(
      0
    );
  });

  it("returns null when not on reminder day", () => {
    const nextDueAt = new Date("2027-06-01T00:00:00Z");
    const now = new Date("2027-05-01T00:00:00Z");
    expect(getTrainingReminderDay({ nextDueAt }, now)).toBeNull();
  });
});

describe("qualifiesForManualTrainingReminder", () => {
  it("includes overdue and upcoming within 30 days", () => {
    const nextDueAt = new Date("2027-06-01T00:00:00Z");
    expect(
      qualifiesForManualTrainingReminder(
        { nextDueAt },
        new Date("2027-05-15T00:00:00Z")
      )
    ).toBe(true);
    expect(
      qualifiesForManualTrainingReminder(
        { nextDueAt },
        new Date("2027-06-10T00:00:00Z")
      )
    ).toBe(true);
  });

  it("excludes training more than 30 days before due", () => {
    const nextDueAt = new Date("2027-06-01T00:00:00Z");
    expect(
      qualifiesForManualTrainingReminder(
        { nextDueAt },
        new Date("2027-04-01T00:00:00Z")
      )
    ).toBe(false);
  });
});
