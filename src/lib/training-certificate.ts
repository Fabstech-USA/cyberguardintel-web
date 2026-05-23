import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { putObjectToS3 } from "@/lib/s3";

export type TrainingAttestationInput = {
  organizationName: string;
  employeeName: string;
  employeeEmail: string;
  trainingTitle: string;
  completedAt: Date;
  nextDueAt: Date;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function generateTrainingAttestationPdf(
  input: TrainingAttestationInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();
  let y = height - 72;

  const draw = (text: string, size: number, bold = false) => {
    page.drawText(text, {
      x: 72,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= size + 10;
  };

  draw("HIPAA Workforce Training Attestation", 18, true);
  y -= 8;
  draw(`Organization: ${input.organizationName}`, 12);
  draw(`Employee: ${input.employeeName}`, 12);
  draw(`Email: ${input.employeeEmail}`, 12);
  draw(`Training: ${input.trainingTitle}`, 12, true);
  y -= 8;
  draw(`Completed: ${formatDate(input.completedAt)}`, 12);
  draw(`Next annual due: ${formatDate(input.nextDueAt)}`, 12);
  y -= 16;
  draw(
    "I attest that I completed the training module listed above and understand my obligations under HIPAA 45 CFR 164.308(a)(5).",
    11
  );
  y -= 24;
  draw("Signed electronically via CyberGuardIntel", 10);
  draw(`Generated: ${formatDate(new Date())}`, 10);

  return pdf.save();
}

export type EmployeeAttestationTopic = {
  trainingTitle: string;
  completedAt: Date;
  nextDueAt: Date;
};

export async function generateEmployeeAttestationPdf(
  input: {
    organizationName: string;
    employeeName: string;
    employeeEmail: string;
    topics: EmployeeAttestationTopic[];
  }
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();
  let y = height - 72;

  const draw = (text: string, size: number, bold = false) => {
    page.drawText(text, {
      x: 72,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= size + 8;
  };

  draw("Annual HIPAA Training Certificate", 18, true);
  y -= 4;
  draw(`Organization: ${input.organizationName}`, 11);
  draw(`Employee: ${input.employeeName}`, 11);
  draw(`Email: ${input.employeeEmail}`, 11);
  y -= 8;
  draw("Completed modules:", 12, true);

  for (const topic of input.topics) {
    if (y < 120) break;
    draw(
      `• ${topic.trainingTitle} — ${formatDate(topic.completedAt)} (due ${formatDate(topic.nextDueAt)})`,
      10
    );
  }

  y -= 12;
  draw(
    "All required annual workforce training modules are complete per 45 CFR 164.308(a)(5).",
    10
  );

  return pdf.save();
}

export function trainingAttestationS3Key(
  organizationId: string,
  recordId: string
): string {
  return `hipaa/training/${organizationId}/${recordId}-attestation.pdf`;
}

export function employeeAttestationS3Key(
  organizationId: string,
  employeeId: string
): string {
  return `hipaa/training/${organizationId}/${employeeId}-annual-certificate.pdf`;
}

export async function uploadTrainingAttestation(
  organizationId: string,
  recordId: string,
  bytes: Uint8Array
): Promise<string> {
  const key = trainingAttestationS3Key(organizationId, recordId);
  await putObjectToS3(key, bytes, "application/pdf");
  return key;
}

export async function uploadEmployeeAttestation(
  organizationId: string,
  employeeId: string,
  bytes: Uint8Array
): Promise<string> {
  const key = employeeAttestationS3Key(organizationId, employeeId);
  await putObjectToS3(key, bytes, "application/pdf");
  return key;
}
