import { describe, expect, it } from "vitest";
import { z } from "zod";

const InviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(20),
});

describe("InviteSchema validation", () => {
  it("accepts a single valid email", () => {
    const result = InviteSchema.safeParse({ emails: ["alice@example.com"] });
    expect(result.success).toBe(true);
  });

  it("accepts multiple valid emails", () => {
    const result = InviteSchema.safeParse({
      emails: ["a@b.com", "c@d.org", "e@f.io"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts exactly 20 emails (max)", () => {
    const emails = Array.from({ length: 20 }, (_, i) => `user${i}@test.com`);
    const result = InviteSchema.safeParse({ emails });
    expect(result.success).toBe(true);
  });

  it("rejects more than 20 emails", () => {
    const emails = Array.from({ length: 21 }, (_, i) => `user${i}@test.com`);
    const result = InviteSchema.safeParse({ emails });
    expect(result.success).toBe(false);
  });

  it("rejects an empty array", () => {
    const result = InviteSchema.safeParse({ emails: [] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = InviteSchema.safeParse({ emails: ["not-an-email"] });
    expect(result.success).toBe(false);
  });

  it("rejects if any email in array is invalid", () => {
    const result = InviteSchema.safeParse({
      emails: ["valid@test.com", "bad-email"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing emails field", () => {
    const result = InviteSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
