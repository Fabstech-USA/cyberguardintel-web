import { beforeEach, describe, expect, it, vi } from "vitest";

const { isAuthorizedCronRequestMock, listEventsMock, sendEmailMock } = vi.hoisted(
  () => ({
    isAuthorizedCronRequestMock: vi.fn(),
    listEventsMock: vi.fn(),
    sendEmailMock: vi.fn(),
  })
);

vi.mock("@/lib/cron-auth", () => ({
  isAuthorizedCronRequest: isAuthorizedCronRequestMock,
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ events: { list: listEventsMock } }),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: sendEmailMock,
}));

import { POST } from "./route";

const NOW_SECONDS = 1_700_000_000;

describe("POST /api/monitoring/stripe-webhook-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW_SECONDS * 1000);
    process.env.OPS_ALERT_EMAIL = "jose.fabian.dev@gmail.com";
    listEventsMock.mockResolvedValue({ data: [] });
    sendEmailMock.mockResolvedValue(undefined);
  });

  it("returns 401 when cron auth fails", async () => {
    isAuthorizedCronRequestMock.mockReturnValue(false);

    const res = await POST(
      new Request("http://localhost/api/monitoring/stripe-webhook-health")
    );

    expect(res.status).toBe(401);
    expect(listEventsMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("does not email when there are no failing deliveries", async () => {
    isAuthorizedCronRequestMock.mockReturnValue(true);
    listEventsMock.mockResolvedValue({ data: [] });

    const res = await POST(
      new Request("http://localhost/api/monitoring/stripe-webhook-health", {
        method: "POST",
        headers: { Authorization: "Bearer cron-secret" },
      })
    );

    expect(res.status).toBe(200);
    expect(listEventsMock).toHaveBeenCalledWith({
      delivery_success: false,
      created: { gte: NOW_SECONDS - 6 * 60 * 60 },
      limit: 100,
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      ok: true,
      checked: 0,
      failing: 0,
    });
  });

  it("does not email a failing delivery still inside the retry grace period", async () => {
    isAuthorizedCronRequestMock.mockReturnValue(true);
    listEventsMock.mockResolvedValue({
      data: [
        {
          id: "evt_recent",
          type: "invoice.payment_failed",
          created: NOW_SECONDS - 60, // 1 minute old, well under 30 min grace
          pending_webhooks: 1,
        },
      ],
    });

    const res = await POST(
      new Request("http://localhost/api/monitoring/stripe-webhook-health", {
        method: "POST",
        headers: { Authorization: "Bearer cron-secret" },
      })
    );

    expect(sendEmailMock).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      ok: true,
      checked: 1,
      failing: 0,
    });
  });

  it("emails ops when a delivery has failed past the retry grace period", async () => {
    isAuthorizedCronRequestMock.mockReturnValue(true);
    listEventsMock.mockResolvedValue({
      data: [
        {
          id: "evt_stale",
          type: "customer.subscription.updated",
          created: NOW_SECONDS - 60 * 60, // 1 hour old, past 30 min grace
          pending_webhooks: 2,
        },
      ],
    });

    const res = await POST(
      new Request("http://localhost/api/monitoring/stripe-webhook-health", {
        method: "POST",
        headers: { Authorization: "Bearer cron-secret" },
      })
    );

    expect(sendEmailMock).toHaveBeenCalledOnce();
    const call = sendEmailMock.mock.calls[0][0];
    expect(call.to).toBe("jose.fabian.dev@gmail.com");
    expect(call.subject).toContain("1 event");
    expect(call.html).toContain("evt_stale");
    expect(call.html).toContain("customer.subscription.updated");

    await expect(res.json()).resolves.toEqual({
      ok: true,
      checked: 1,
      failing: 1,
    });
  });

  it("throws if OPS_ALERT_EMAIL is unset when an alert would be sent", async () => {
    delete process.env.OPS_ALERT_EMAIL;
    isAuthorizedCronRequestMock.mockReturnValue(true);
    listEventsMock.mockResolvedValue({
      data: [
        {
          id: "evt_stale",
          type: "customer.subscription.updated",
          created: NOW_SECONDS - 60 * 60,
          pending_webhooks: 2,
        },
      ],
    });

    await expect(
      POST(
        new Request("http://localhost/api/monitoring/stripe-webhook-health", {
          method: "POST",
          headers: { Authorization: "Bearer cron-secret" },
        })
      )
    ).rejects.toThrow("OPS_ALERT_EMAIL is not set");
  });
});
