import type { PolicyType } from "@/generated/prisma";

export type RegenerateStreamEvent =
  | {
      policy_type: PolicyType;
      phase: "started" | "completed" | "failed";
      error?: string;
    }
  | { phase: "error"; error: string };

export type RegenerateStreamCallbacks = {
  onStarted?: (policyType: PolicyType) => void;
  onCompleted?: (policyType: PolicyType) => void;
  onFailed?: (policyType: PolicyType, error: string) => void;
};

/** Calls POST /api/hipaa/policies/generate-stream for one or more policy types. */
export async function regeneratePoliciesViaStream(
  policyTypes: PolicyType[],
  callbacks?: RegenerateStreamCallbacks
): Promise<void> {
  if (policyTypes.length === 0) return;

  const res = await fetch("/api/hipaa/policies/generate-stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ policyTypes }),
  });

  if (!res.ok || !res.body) {
    let message = `Generation failed (${res.status})`;
    try {
      const text = await res.text();
      const parsed = text ? (JSON.parse(text) as { error?: string }) : null;
      if (parsed?.error) message = parsed.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      let evt: RegenerateStreamEvent;
      try {
        evt = JSON.parse(t) as RegenerateStreamEvent;
      } catch {
        continue;
      }
      if (evt.phase === "error") {
        throw new Error(evt.error);
      }
      if (!("policy_type" in evt)) continue;
      if (evt.phase === "started") {
        callbacks?.onStarted?.(evt.policy_type);
      } else if (evt.phase === "completed") {
        callbacks?.onCompleted?.(evt.policy_type);
      } else if (evt.phase === "failed") {
        callbacks?.onFailed?.(evt.policy_type, evt.error ?? "Generation failed");
      }
    }
  }
}
