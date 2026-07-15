import { timingSafeEqual } from "crypto";

function secretsMatch(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

/** Auth for scheduled cron hits (Vercel CRON_SECRET or INTERNAL_API_KEY). */
export function isAuthorizedCronRequest(req: Request): boolean {
  const header =
    req.headers.get("x-internal-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!header) return false;

  const internalKey = process.env.INTERNAL_API_KEY?.trim();
  if (internalKey && secretsMatch(header, internalKey)) return true;

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && secretsMatch(header, cronSecret)) return true;

  return false;
}
