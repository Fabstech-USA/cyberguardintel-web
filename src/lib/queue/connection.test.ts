import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveRedisUrl } from "@/lib/queue/connection";

describe("resolveRedisUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns rediss URL unchanged", () => {
    vi.stubEnv(
      "UPSTASH_REDIS_URL",
      "rediss://default:token@host.upstash.io:6379"
    );
    expect(resolveRedisUrl()).toBe("rediss://default:token@host.upstash.io:6379");
  });

  it("builds TCP URL from HTTPS hostname and token", () => {
    vi.stubEnv("UPSTASH_REDIS_URL", "https://champion-mustang-155546.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_TOKEN", "my-token");
    expect(resolveRedisUrl()).toBe(
      "rediss://default:my-token@champion-mustang-155546.upstash.io:6379"
    );
  });

  it("throws a helpful error when HTTPS URL has no token", () => {
    vi.stubEnv("UPSTASH_REDIS_URL", "https://host.upstash.io");
    expect(() => resolveRedisUrl()).toThrow(/TCP URL/);
  });
});
