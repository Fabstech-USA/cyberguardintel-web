import type { TrainingRecord } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  generateTrainingAttestationPdf,
  uploadTrainingAttestation,
} from "@/lib/training-certificate";
import {
  computeNextDueAt,
  normalizeTrainingCreateInput,
  type TrainingRecordCreateInput,
} from "@/lib/training";

export async function createTrainingRecordWithAttestation(
  organizationId: string,
  organizationName: string,
  input: TrainingRecordCreateInput
): Promise<TrainingRecord> {
  const normalized = normalizeTrainingCreateInput(input);
  const completedAt = normalized.completedAt;
  const nextDueAt = computeNextDueAt(completedAt);

  const created = await prisma.trainingRecord.create({
    data: {
      organizationId,
      employeeId: normalized.employeeId,
      employeeName: normalized.employeeName,
      employeeEmail: normalized.employeeEmail,
      employeeJobTitle: normalized.employeeJobTitle ?? null,
      trainingTitle: normalized.trainingTitle,
      completedAt,
      nextDueAt,
    },
  });

  try {
    const pdfBytes = await generateTrainingAttestationPdf({
      organizationName,
      employeeName: created.employeeName,
      employeeEmail: created.employeeEmail,
      trainingTitle: created.trainingTitle,
      completedAt: created.completedAt,
      nextDueAt: created.nextDueAt,
    });
    const attestationS3Key = await uploadTrainingAttestation(
      organizationId,
      created.id,
      pdfBytes
    );
    return prisma.trainingRecord.update({
      where: { id: created.id },
      data: { attestationS3Key },
    });
  } catch (err) {
    console.error("Training attestation PDF failed:", err);
    return created;
  }
}

export async function regenerateTrainingAttestation(
  organizationId: string,
  organizationName: string,
  record: TrainingRecord
): Promise<TrainingRecord> {
  try {
    const pdfBytes = await generateTrainingAttestationPdf({
      organizationName,
      employeeName: record.employeeName,
      employeeEmail: record.employeeEmail,
      trainingTitle: record.trainingTitle,
      completedAt: record.completedAt,
      nextDueAt: record.nextDueAt,
    });
    const attestationS3Key = await uploadTrainingAttestation(
      organizationId,
      record.id,
      pdfBytes
    );
    return prisma.trainingRecord.update({
      where: { id: record.id },
      data: { attestationS3Key },
    });
  } catch (err) {
    console.error("Training attestation PDF failed:", err);
    return record;
  }
}
