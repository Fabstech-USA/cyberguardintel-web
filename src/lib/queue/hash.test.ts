import { describe, expect, it } from "vitest";

import { hashRawData, stableStringify } from "@/lib/queue/hash";

describe("queue/hash", () => {
  it("stableStringify sorts object keys recursively", () => {
    const a = stableStringify({ z: 1, a: { y: 2, b: 3 } });
    const b = stableStringify({ a: { b: 3, y: 2 }, z: 1 });
    expect(a).toBe(b);
  });

  it("hashRawData is stable for equivalent objects", () => {
    const first = hashRawData({ users: [{ name: "a" }], total: 1 });
    const second = hashRawData({ total: 1, users: [{ name: "a" }] });
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});
