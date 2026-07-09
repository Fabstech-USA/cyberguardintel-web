import { beforeEach, describe, expect, it, vi } from "vitest";

const { isAuthorizedCronRequestMock, enqueueScheduledIntegrationSyncsMock } =
  vi.hoisted(() => ({
    isAuthorizedCronRequestMock: vi.fn(),
    enqueueScheduledIntegrationSyncsMock: vi.fn(),
  }));

vi.mock("@/lib/cron-auth", () => ({
  isAuthorizedCronRequest: isAuthorizedCronRequestMock,
}));

vi.mock("@/lib/queue/scheduled-sync", () => ({
  enqueueScheduledIntegrationSyncs: enqueueScheduledIntegrationSyncsMock,
}));

import { POST } from "./route";

describe("POST /api/integrations/sync/cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enqueueScheduledIntegrationSyncsMock.mockResolvedValue({
      scanned: 3,
      enqueued: 3,
      failed: 0,
      failures: [],
    });
  });

  it("returns 401 when cron auth fails", async () => {
    isAuthorizedCronRequestMock.mockReturnValue(false);

    const res = await POST(new Request("http://localhost/api/integrations/sync/cron"));

    expect(res.status).toBe(401);
    expect(enqueueScheduledIntegrationSyncsMock).not.toHaveBeenCalled();
  });

  it("returns summary when authorized", async () => {
    isAuthorizedCronRequestMock.mockReturnValue(true);

    const res = await POST(
      new Request("http://localhost/api/integrations/sync/cron", {
        method: "POST",
        headers: { Authorization: "Bearer cron-secret" },
      })
    );

    expect(res.status).toBe(200);
    expect(enqueueScheduledIntegrationSyncsMock).toHaveBeenCalledOnce();
    await expect(res.json()).resolves.toEqual({
      ok: true,
      scanned: 3,
      enqueued: 3,
      failed: 0,
      failures: [],
    });
  });
});
