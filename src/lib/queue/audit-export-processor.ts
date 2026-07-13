import {
  buildAndUploadAuditPackage,
  progressStepsToJson,
} from "@/lib/audit-package";
import type { AuditProgressStep } from "@/lib/audit-package-sections";
import type { AuditExportJobPayload } from "@/lib/queue/types";
import { prisma } from "@/lib/prisma";

export type ProcessAuditExportResult = {
  status: "COMPLETED" | "FAILED";
  s3Key?: string;
};

async function markFailed(
  auditExportJobId: string,
  errorMessage: string
): Promise<void> {
  await prisma.auditExportJob.update({
    where: { id: auditExportJobId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: errorMessage.slice(0, 2000),
    },
  });
}

export async function processAuditExportJob(
  payload: AuditExportJobPayload
): Promise<ProcessAuditExportResult> {
  const job = await prisma.auditExportJob.findUnique({
    where: { id: payload.auditExportJobId },
  });

  if (!job) {
    throw new Error(`AuditExportJob ${payload.auditExportJobId} not found`);
  }

  if (job.organizationId !== payload.organizationId) {
    throw new Error("AuditExportJob organization mismatch");
  }

  await prisma.auditExportJob.update({
    where: { id: job.id },
    data: { status: "RUNNING", startedAt: new Date(), errorMessage: null },
  });

  try {
    const result = await buildAndUploadAuditPackage({
      organizationId: payload.organizationId,
      exportJobId: job.id,
      from: new Date(payload.from),
      to: new Date(payload.to),
      controlRefs: payload.controlRefs,
      sections:
        payload.sections && payload.sections.length > 0
          ? payload.sections
          : job.sections,

      onProgress: async (steps: AuditProgressStep[], currentStep: string | null) => {
        await prisma.auditExportJob.update({
          where: { id: job.id },
          data: {
            progressSteps: progressStepsToJson(steps),
            currentStep,
          },
        });
      },
    });

    await prisma.auditExportJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        s3Key: result.s3Key,
        errorMessage: null,
        currentStep: null,
      },
    });

    return { status: "COMPLETED", s3Key: result.s3Key };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit package export failed";
    await markFailed(job.id, message);
    return { status: "FAILED" };
  }
}
