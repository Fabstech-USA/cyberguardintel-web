import { NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  email: z.string().email(),
});

/**
 * MVP: validates and accepts SOC 2 waitlist signups. Persistence (CRM, email) can
 * be wired later; for now we only validate to keep the UX real.
 */
export async function POST(req: Request): Promise<NextResponse> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
