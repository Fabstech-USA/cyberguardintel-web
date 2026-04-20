import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/waitlist/soc2", () => {
  it("rejects invalid email", async () => {
    const res = await POST(
      new Request("http://localhost/api/waitlist/soc2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("accepts valid email", async () => {
    const res = await POST(
      new Request("http://localhost/api/waitlist/soc2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com" }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
  });
});
