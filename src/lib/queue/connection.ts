import type { ConnectionOptions } from "bullmq";

function readToken(): string | undefined {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.UPSTASH_REDIS_TOKEN?.trim() ||
    undefined
  );
}

/**
 * BullMQ/ioredis needs the Upstash TCP URL (`rediss://...`), not the REST HTTPS endpoint.
 * If only the REST hostname + token are configured, build the TCP URL automatically.
 */
export function resolveRedisUrl(): string {
  const raw = process.env.UPSTASH_REDIS_URL?.trim();
  if (!raw) {
    throw new Error(
      "UPSTASH_REDIS_URL is not set. Use the TCP URL from Upstash → Redis → Connect → Node/ioredis " +
        "(rediss://default:TOKEN@HOST.upstash.io:6379)."
    );
  }

  if (raw.startsWith("redis://") || raw.startsWith("rediss://")) {
    return raw;
  }

  const token = readToken();
  const restHost =
    raw.startsWith("https://") || raw.startsWith("http://")
      ? new URL(raw).hostname
      : process.env.UPSTASH_REDIS_REST_URL?.trim()
        ? new URL(process.env.UPSTASH_REDIS_REST_URL.trim()).hostname
        : null;

  if (restHost && token) {
    return `rediss://default:${encodeURIComponent(token)}@${restHost}:6379`;
  }

  if (raw.startsWith("https://") || raw.startsWith("http://")) {
    throw new Error(
      "UPSTASH_REDIS_URL is an HTTPS REST endpoint. BullMQ requires the TCP URL " +
        "(rediss://default:TOKEN@HOST.upstash.io:6379) from Upstash → Redis → Connect → Node/ioredis, " +
        "or set UPSTASH_REDIS_TOKEN alongside the REST hostname."
    );
  }

  throw new Error(
    "UPSTASH_REDIS_URL must be a redis:// or rediss:// URL. See Upstash → Redis → Connect → Node/ioredis."
  );
}

export function getRedisConnectionOptions(): ConnectionOptions {
  return {
    url: resolveRedisUrl(),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
