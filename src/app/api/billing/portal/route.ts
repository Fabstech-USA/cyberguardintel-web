import { withTenant } from "@/lib/tenant";
import { getOrCreateCustomer, getStripe } from "@/lib/stripe";

export const POST = withTenant(async (_req, ctx) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return Response.json(
      { error: "NEXT_PUBLIC_APP_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const customerId = await getOrCreateCustomer(ctx.organizationId);
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl.replace(/\/$/, "")}/settings/billing`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Billing portal session failed:", err);
    return Response.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
});
