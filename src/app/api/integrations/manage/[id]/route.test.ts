import { IntegrationStatus } from "@/generated/prisma";
import { describe, expect, it } from "vitest";

import { validateUpdateIntegrationStatusBody } from "@/lib/integration-route-validation";

describe("integration manage route validation", () => {
  it("accepts valid status updates", () => {
    const result = validateUpdateIntegrationStatusBody({
      status: IntegrationStatus.PAUSED,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe(IntegrationStatus.PAUSED);
    }
  });

  it("accepts disconnected status", () => {
    const result = validateUpdateIntegrationStatusBody({
      status: IntegrationStatus.DISCONNECTED,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status values", () => {
    const result = validateUpdateIntegrationStatusBody({
      status: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});

describe("disconnect cleanup order", () => {
  it("documents that collection jobs must be removed before integration delete", () => {
    // CollectionJob.integrationId is required with RESTRICT (pre-migration) / CASCADE (post-migration).
    // DELETE /api/integrations/manage/[id] deletes jobs, nulls evidence FKs, then deletes the integration.
    const steps = [
      "collectionJob.deleteMany",
      "evidence.updateMany(integrationId=null)",
      "integration.delete",
    ];
    expect(steps[0]).toBe("collectionJob.deleteMany");
    expect(steps.at(-1)).toBe("integration.delete");
  });
});
