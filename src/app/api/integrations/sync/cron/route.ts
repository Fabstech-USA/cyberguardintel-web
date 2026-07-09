import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { enqueueScheduledIntegrationSyncs } from "@/lib/queue/scheduled-sync";

export async function POST(req: Request): Promise<Response> {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await enqueueScheduledIntegrationSyncs();

  return NextResponse.json({ ok: true, ...result });
}
