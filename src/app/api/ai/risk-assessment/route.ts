import { NextResponse } from "next/server";
import { callAiService } from "@/lib/ai-client";
import {
  AiRiskInputSchema,
  AiRiskOutputSchema,
  type AiRiskOutput,
} from "@/lib/ai-risk-assessment";
import { withTenant } from "@/lib/tenant";

/**
 * Thin proxy to the FastAPI service's POST /hipaa/risk-assessment.
 * Validates input matches the AI contract, forwards via callAiService,
 * validates the response, and returns the AI output unchanged.
 *
 * Persistence and audit logging happen in the user-facing
 * /api/hipaa/risk-assessment route, not here.
 */
export const POST = withTenant(async (req, _ctx): Promise<Response> => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = AiRiskInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  let raw: unknown;
  try {
    raw = await callAiService<AiRiskOutput>(
      "/hipaa/risk-assessment",
      parsed.data
    );
  } catch (err) {
    console.error("AI risk-assessment call failed", err);
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 502 }
    );
  }

  const out = AiRiskOutputSchema.safeParse(raw);
  if (!out.success) {
    console.error("AI risk-assessment response invalid", out.error.flatten());
    return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });
  }

  return NextResponse.json(out.data, { status: 200 });
});
