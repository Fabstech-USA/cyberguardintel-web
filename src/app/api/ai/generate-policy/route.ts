import { NextResponse } from "next/server";
import { z } from "zod";
import { PolicyType } from "@/generated/prisma";
import {
  AiGeneratePolicyRequestSchema,
  AiPolicyOutputSchema,
  buildGeneratePolicyPayload,
  loadOrganizationSnapshotForPolicyAi,
} from "@/lib/ai-policy-generation";
import { callAiService } from "@/lib/ai-client";
import { withTenant } from "@/lib/tenant";

const BodySchema = z.object({
  policy_type: z.nativeEnum(PolicyType),
});

/**
 * Thin proxy to FastAPI `POST /hipaa/generate-policy`.
 * Builds org context server-side; validates AI response; does not persist.
 */
export const POST = withTenant(async (req, _ctx): Promise<Response> => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const snapshot = await loadOrganizationSnapshotForPolicyAi(_ctx.organizationId);
  if (!snapshot) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  const payload = buildGeneratePolicyPayload(
    snapshot,
    parsed.data.policy_type
  );

  const innerCheck = AiGeneratePolicyRequestSchema.safeParse(payload);
  if (!innerCheck.success) {
    return NextResponse.json(
      { error: "Invalid merged payload", details: innerCheck.error.flatten() },
      { status: 500 }
    );
  }

  let raw: unknown;
  try {
    raw = await callAiService<unknown>(
      "/hipaa/generate-policy",
      innerCheck.data
    );
  } catch (err) {
    console.error("AI generate-policy call failed", err);
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 502 }
    );
  }

  const out = AiPolicyOutputSchema.safeParse(raw);
  if (!out.success) {
    console.error(
      "AI generate-policy response invalid",
      out.error.flatten()
    );
    return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });
  }

  return NextResponse.json(out.data, { status: 200 });
});
