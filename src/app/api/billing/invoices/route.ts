import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { withTenant } from "@/lib/tenant";

export const GET = withTenant(async (_req, ctx) => {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { stripeCustomerId: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (!org.stripeCustomerId) {
    return NextResponse.json({ invoices: [] });
  }

  try {
    const list = await getStripe().invoices.list({
      customer: org.stripeCustomerId,
      limit: 24,
    });

    return NextResponse.json({
      invoices: list.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        created: invoice.created,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      })),
    });
  } catch (err) {
    console.error("Failed to list Stripe invoices:", err);
    return NextResponse.json(
      { error: "Failed to load invoices" },
      { status: 500 }
    );
  }
});
