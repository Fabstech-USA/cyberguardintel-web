import { Webhook } from "svix";
import { headers } from "next/headers";
import {
  handleOrganizationCreated,
  handleOrganizationMembershipCreated,
  handleOrganizationMembershipUpdated,
} from "@/lib/clerk-webhook-sync";

type ClerkWebhookEvent = {
  type: string;
  data: Record<string, unknown>;
};

async function verifyWebhook(req: Request): Promise<ClerkWebhookEvent> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("CLERK_WEBHOOK_SECRET is not set");
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
  }) as ClerkWebhookEvent;
}

export async function POST(req: Request): Promise<Response> {
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id") ?? "";

  let event: ClerkWebhookEvent;
  try {
    event = await verifyWebhook(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "CLERK_WEBHOOK_SECRET is not set") {
      return new Response("Server misconfiguration", { status: 500 });
    }
    if (message === "Missing svix headers") {
      return new Response("Missing svix headers", { status: 400 });
    }
    return new Response("Invalid signature", { status: 401 });
  }

  const meta = { eventType: event.type, svixId };

  try {
    if (event.type === "organization.created") {
      await handleOrganizationCreated(
        event.data as { id?: string; name?: string },
        meta
      );
    } else if (event.type === "organizationMembership.created") {
      await handleOrganizationMembershipCreated(
        event.data as {
          organization?: { id?: string; name?: string };
          public_user_data?: { user_id?: string };
          role?: string;
        },
        meta
      );
    } else if (event.type === "organizationMembership.updated") {
      await handleOrganizationMembershipUpdated(
        event.data as {
          organization?: { id?: string; name?: string };
          public_user_data?: { user_id?: string };
          role?: string;
        },
        meta
      );
    }
  } catch (e) {
    console.error("Clerk webhook handler failed:", e);
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
