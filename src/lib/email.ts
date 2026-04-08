export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(_message: EmailMessage) {
  throw new Error("Not implemented");
}

