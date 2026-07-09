import { describe, expect, it, vi } from "vitest";

const listEvidenceMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/evidence-queries", () => ({
  listEvidence: listEvidenceMock,
}));

vi.mock("@/lib/tenant", () => ({
  withTenant:
    (handler: (req: Request, ctx: unknown) => Promise<Response>) =>
    (req: Request) =>
      handler(req, {
        organizationId: "org_1",
        clerkUserId: "user_1",
        orgRole: "ADMIN",
      }),
}));

import { GET } from "./route";

describe("GET /api/evidence", () => {
  it("returns list results for valid query params", async () => {
    listEvidenceMock.mockResolvedValue({
      items: [{ id: "ev_1" }],
      nextCursor: null,
      hasMore: false,
    });

    const res = await GET(
      new Request(
        "http://localhost/api/evidence?source=aws&freshness=fresh&limit=50"
      )
    );

    expect(res.status).toBe(200);
    expect(listEvidenceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        source: "aws",
        freshness: "fresh",
        limit: 50,
      })
    );
    await expect(res.json()).resolves.toEqual({
      items: [{ id: "ev_1" }],
      nextCursor: null,
      hasMore: false,
    });
  });

  it("rejects invalid freshness values", async () => {
    const res = await GET(
      new Request("http://localhost/api/evidence?freshness=invalid")
    );
    expect(res.status).toBe(400);
  });
});
