import { createHash } from "crypto";

/** Stable JSON serialization with sorted object keys (matches §6.4 dedup). */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`
  );
  return `{${entries.join(",")}}`;
}

export function hashRawData(rawData: Record<string, unknown>): string {
  return createHash("sha256").update(stableStringify(rawData)).digest("hex");
}
