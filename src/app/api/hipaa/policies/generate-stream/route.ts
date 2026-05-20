import { z } from "zod";
import {
  PolicyType,
} from "@/generated/prisma";
import {
  AiGeneratePolicyRequestSchema,
  AiPolicyOutputSchema,
  buildGeneratePolicyPayload,
  loadOrganizationSnapshotForPolicyAi,
} from "@/lib/ai-policy-generation";
import { callAiService } from "@/lib/ai-client";
import { canManageHipaaPolicies } from "@/lib/hipaa-policy-access";
import { HIPAA_POLICY_TYPE_ORDER } from "@/lib/hipaa-policy-catalog";
import { upsertHipaaPolicyDraftFromAi } from "@/lib/hipaa-policy-persist";
import { withTenant } from "@/lib/tenant";

export const maxDuration = 300;

const BodySchema = z.object({
  policyTypes: z.array(z.nativeEnum(PolicyType)).optional(),
});

type StreamEvent =
  | {
      policy_type: PolicyType;
      phase: "started";
    }
  | {
      policy_type: PolicyType;
      phase: "completed";
      policyId: string;
    }
  | {
      policy_type: PolicyType;
      phase: "failed";
      error: string;
    }
  | {
      phase: "error";
      error: string;
    };

/**
 * Sequential AI generation + DB upsert with NDJSON progress events (one JSON object per line).
 * Vercel/serverless max duration applies — see `maxDuration` above.
 */
export const POST = withTenant(async (req, ctx): Promise<Response> => {
  if (!canManageHipaaPolicies(ctx.orgRole)) {
    return new Response(
      JSON.stringify({
        phase: "error",
        error: "Only owners or admins can generate policies.",
      }),
      { status: 403, headers: { "content-type": "application/json" } }
    );
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsedBody = BodySchema.safeParse(body);
  if (!parsedBody.success) {
    return new Response(
      JSON.stringify({
        phase: "error",
        error: "Invalid body",
        details: parsedBody.error.flatten(),
      }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const snapshot = await loadOrganizationSnapshotForPolicyAi(
    ctx.organizationId
  );
  if (!snapshot) {
    return new Response(
      JSON.stringify({ phase: "error", error: "Organization not found" }),
      { status: 404, headers: { "content-type": "application/json" } }
    );
  }

  const types =
    parsedBody.data.policyTypes && parsedBody.data.policyTypes.length > 0
      ? parsedBody.data.policyTypes
      : [...HIPAA_POLICY_TYPE_ORDER];

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (evt: StreamEvent) => {
        controller.enqueue(
          encoder.encode(`${JSON.stringify(evt)}\n`)
        );
      };

      for (const policyType of types) {
        push({ policy_type: policyType, phase: "started" });

        try {
          const payload = buildGeneratePolicyPayload(snapshot, policyType);
          const checked = AiGeneratePolicyRequestSchema.safeParse(payload);
          if (!checked.success) {
            push({
              policy_type: policyType,
              phase: "failed",
              error: "Invalid AI request payload",
            });
            continue;
          }

          let raw: unknown;
          try {
            raw = await callAiService<unknown>(
              "/hipaa/generate-policy",
              checked.data
            );
          } catch (err) {
            push({
              policy_type: policyType,
              phase: "failed",
              error:
                err instanceof Error ? err.message : "AI service unavailable",
            });
            continue;
          }

          const out = AiPolicyOutputSchema.safeParse(raw);
          if (!out.success) {
            push({
              policy_type: policyType,
              phase: "failed",
              error: "Invalid AI response",
            });
            continue;
          }

          const saved = await upsertHipaaPolicyDraftFromAi({
            organizationId: ctx.organizationId,
            clerkUserId: ctx.clerkUserId,
            output: out.data,
          });

          push({
            policy_type: policyType,
            phase: "completed",
            policyId: saved.id,
          });
        } catch (e) {
          push({
            policy_type: policyType,
            phase: "failed",
            error: e instanceof Error ? e.message : "Unexpected error",
          });
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
});
