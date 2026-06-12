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
