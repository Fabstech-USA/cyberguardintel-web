import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

let resendClient: Resend | null = null;

function getFromEmail(): string {
  const fromEmail = process.env.FROM_EMAIL;
  if (!fromEmail) {
    throw new Error("FROM_EMAIL is not set");
  }
  return fromEmail;
}

function getResendClient(): Resend {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

export async function sendEmail(message: EmailMessage) {
  const resend = getResendClient();
  const result = await resend.emails.send({
    from: getFromEmail(),
    to: [message.to],
    subject: message.subject,
    html: message.html,
  });

  if (result.error) {
    throw new Error(result.error.message || "Email delivery failed");
  }

  return result.data;
}

