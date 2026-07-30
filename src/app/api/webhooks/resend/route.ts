// Webhooks authenticate via Svix signature (not session). Do not use withTenant here.
//
// Registered in Resend Dashboard > Webhooks, pointed at
// https://cyberguardintel.ai/api/webhooks/resend for the `email.received` event.
// This is what fires when mail arrives at the notifications.cyberguardintel.ai
// inbound address (see MX record added for receiving in Squarespace DNS).

import { Webhook } from "svix";
import { headers } from "next/headers";

type ResendEmailReceivedData = {
  email_id?: string;
  created_at?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  received_for?: string[];
  message_id?: string;
  subject?: string;
  attachments?: { id?: string; filename?: string; content_type?: string }[];
};

type ResendWebhookEvent = {
  type: string;
  created_at?: string;
  data: ResendEmailReceivedData | Record<string, unknown>;
};

async function verifyWebhook(req: Request): Promise<ResendWebhookEvent> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("RESEND_WEBHOOK_SECRET is not set");
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error("Missing svix headers");
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  return wh.verify(body, {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  }) as ResendWebhookEvent;
}

export async function POST(req: Request): Promise<Response> {
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id") ?? "";

  let event: ResendWebhookEvent;
  try {
    event = await verifyWebhook(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "RESEND_WEBHOOK_SECRET is not set") {
      return new Response("Server misconfiguration", { status: 500 });
    }
    if (message === "Missing svix headers") {
      return new Response("Missing svix headers", { status: 400 });
    }
    return new Response("Invalid signature", { status: 401 });
  }

  if (event.type !== "email.received") {
    // We only subscribed to email.received, but ignore anything else
    // gracefully in case more event types get added to this endpoint later.
    return Response.json({ received: true });
  }

  const data = event.data as ResendEmailReceivedData;

  try {
    // Minimal handling for now: structured log only (visible in Vercel logs).
    // Full history of received emails is also viewable directly in the Resend
    // dashboard under Emails > Receiving.
    console.log("Resend inbound email received:", {
      svixId,
      emailId: data.email_id,
      from: data.from,
      to: data.to,
      receivedFor: data.received_for,
      subject: data.subject,
      attachmentCount: data.attachments?.length ?? 0,
    });

    // TODO: if this should trigger in-app notifications, Slack alerts, or be
    // stored for later review, wire that up here.
  } catch (err) {
    console.error("Resend webhook handler failed:", {
      svixId,
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
