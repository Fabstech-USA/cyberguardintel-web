import { Queue } from "bullmq";
import {
  initialProgressSteps,
  normalizeAuditPackageSections,
} from "@/lib/audit-package-sections";
import { progressStepsToJson } from "@/lib/audit-package";
import { getRedisConnectionOptions } from "@/lib/queue/connection";
import {
  AUDIT_EXPORT_QUEUE_NAME,
  AUDIT_PACKAGE_JOB_NAME,
  type AuditExportJobPayload,
} from "@/lib/queue/types";
import { prisma } from "@/lib/prisma";

let queue: Queue | null = null;

function getAuditExportQueue(): Queue {
  if (!queue) {
    queue = new Queue(AUDIT_EXPORT_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
    });
  }
  return queue;
}

export type EnqueueAuditExportJobInput = {
  organizationId: string;
  from: Date;
  to: Date;
  controlRefs?: string[];
  sections?: string[];
};

export type EnqueueAuditExportJobResult = {
  jobId: string;
  status: "QUEUED";
};

export async function enqueueAuditExportJob(
  input: EnqueueAuditExportJobInput
): Promise<EnqueueAuditExportJobResult> {
  const controlRefs = input.controlRefs?.filter(Boolean) ?? [];
  const sections = normalizeAuditPackageSections(input.sections);
  const progressSteps = initialProgressSteps(sections);

  const auditExportJob = await prisma.auditExportJob.create({
    data: {
      organizationId: input.organizationId,
      fromDate: input.from,
      toDate: input.to,
      controlRefs,
      sections,
      progressSteps: progressStepsToJson(progressSteps),
      currentStep: null,
      status: "QUEUED",
    },
  });

  const payload: AuditExportJobPayload = {
    auditExportJobId: auditExportJob.id,
    organizationId: input.organizationId,
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    controlRefs,
    sections,
  };

  const bullJob = await getAuditExportQueue().add(AUDIT_PACKAGE_JOB_NAME, payload, {
    jobId: auditExportJob.id,
  });

  await prisma.auditExportJob.update({
    where: { id: auditExportJob.id },
    data: { bullmqJobId: bullJob.id ?? auditExportJob.id },
  });

  return { jobId: auditExportJob.id, status: "QUEUED" };
}

/** Test-only: reset cached queue instance. */
export function resetAuditExportQueueForTests(): void {
  queue = null;
}
