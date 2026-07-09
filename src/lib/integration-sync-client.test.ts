import { describe, expect, it } from "vitest";

import { formatSyncSuccessMessage } from "@/lib/integration-sync-client";
import type { IntegrationPublicDto } from "@/lib/integration-api";

const baseIntegration: IntegrationPublicDto = {
  id: "int_1",
  type: "demo-aws",
  displayName: "AWS",
  status: "ACTIVE",
  lastSyncAt: "2026-06-18T12:00:00.000Z",
  lastSyncStatus: "success",
  lastSyncCount: 0,
  evidenceCount: 3,
  errorMessage: null,
  createdAt: "2026-06-01T12:00:00.000Z",
};

describe("formatSyncSuccessMessage", () => {
  it("mentions new evidence count when items were added", () => {
    expect(formatSyncSuccessMessage(baseIntegration, 2)).toContain("2 new evidence items");
  });

  it("mentions up to date when sync was partial dedup", () => {
    expect(
      formatSyncSuccessMessage(
        { ...baseIntegration, lastSyncStatus: "partial" },
        0
      )
    ).toContain("already up to date");
  });

  it("falls back to generic success copy", () => {
    expect(formatSyncSuccessMessage(baseIntegration, 0)).toContain(
      "synced successfully"
    );
  });
});
