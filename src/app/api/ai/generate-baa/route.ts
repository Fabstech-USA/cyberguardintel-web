import { NextResponse } from "next/server";

import { withTenant } from "@/lib/tenant";
import { callAiService } from "@/lib/ai-client";
import {
  AiBaaTemplateInputSchema,
  AiBaaTemplateOutputSchema,
  type AiBaaTemplateOutput,
} from "@/lib/ai-baa-template";

export const POST = withTenant(async (req, _ctx): Promise<Response> => {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = AiBaaTemplateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let raw: unknown;
  try {
    raw = await callAiService<AiBaaTemplateOutput>(
      "/hipaa/baa-template",
      {
        vendor_name: parsed.data.vendorName,
        vendor_email: parsed.data.vendorEmail ?? null,
        services: parsed.data.services,
        organization_name: parsed.data.organizationName,
        hipaa_entity_type: parsed.data.hipaaEntityType,
        notes: parsed.data.notes ?? null,
      }
    );
  } catch (err) {
    console.error("AI BAA template call failed", err);
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 502 }
    );
  }

  const out = AiBaaTemplateOutputSchema.safeParse(raw);
  if (!out.success) {
    console.error("AI BAA template response invalid", out.error.flatten());
    return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });
  }

  return NextResponse.json(out.data, { status: 200 });
});
