import { NextResponse } from "next/server";

import { ContactFormSchema, contactTopicLabel } from "@/lib/contact";
import { sendEmail } from "@/lib/email";
import { ENTERPRISE_SALES_EMAIL } from "@/lib/plans";

/**
 * Public inbox for the contact form. Reuses the sales alias because it's the
 * one address we know is actively monitored today (see ENTERPRISE_SALES_EMAIL
 * in src/lib/plans.ts) — swap this out once a dedicated support/contact alias
 * exists.
 */
const CONTACT_INBOX_EMAIL = ENTERPRISE_SALES_EMAIL;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request): Promise<NextResponse> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ContactFormSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission." },
      { status: 400 }
    );
  }

  const { name, email, organization, topic, message, company_website } =
    parsed.data;

  // Honeypot tripped: report success without sending mail, so scripted
  // submissions can't tell which signal gave them away.
  if (company_website) {
    return NextResponse.json({ ok: true });
  }

  try {
    await sendEmail({
      to: CONTACT_INBOX_EMAIL,
      replyTo: email,
      subject: `[Contact] ${contactTopicLabel(topic)} — ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>New contact form submission</h2>
          <ul>
            <li><strong>Name:</strong> ${escapeHtml(name)}</li>
            <li><strong>Email:</strong> ${escapeHtml(email)}</li>
            ${
              organization
                ? `<li><strong>Organization:</strong> ${escapeHtml(organization)}</li>`
                : ""
            }
            <li><strong>Topic:</strong> ${escapeHtml(contactTopicLabel(topic))}</li>
          </ul>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
        </div>
      `,
    });
  } catch (err) {
    console.error(
      "Contact form email failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      {
        error:
          "We couldn't send your message. Please try again in a moment or email us directly.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
