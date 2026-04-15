import { Webhook } from "svix";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

type ClerkWebhookEvent = {
  type: string;
  data: Record<string, unknown>;
};

async function verifyWebhook(req: Request): Promise<ClerkWebhookEvent> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) throw new Error("CLERK_WEBHOOK_SECRET is not set");

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
  let event: ClerkWebhookEvent;
  try {
    event = await verifyWebhook(req);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "organization.created") {
    const data = event.data as {
      id: string;
      name: string;
      slug: string;
    };

    const existing = await prisma.organization.findUnique({
      where: { clerkOrgId: data.id },
    });

    if (!existing) {
      await prisma.organization.create({
        data: {
          clerkOrgId: data.id,
          name: data.name,
          slug: data.slug ?? data.id,
          billingEmail: "",
          onboardingStep: 0,
        },
      });
    }
  }

  return Response.json({ received: true });
}
