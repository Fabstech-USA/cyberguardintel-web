import { pdf } from "@react-pdf/renderer";
import type { RiskAssessment } from "@/generated/prisma";
import { RiskAssessmentPdfDocument } from "@/components/hipaa/RiskAssessmentPdfDocument";

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function renderRiskAssessmentPdfBuffer(params: {
  assessment: RiskAssessment;
  organizationName: string;
  approvedByName: string | null;
}): Promise<Buffer> {
  const instance = pdf(
    <RiskAssessmentPdfDocument
      assessment={params.assessment}
      organizationName={params.organizationName}
      approvedByName={params.approvedByName}
    />
  );
  const stream = await instance.toBuffer();
  return streamToBuffer(stream);
}
