import { EvidenceSource, IntegrationStatus, type Prisma } from "@/generated/prisma";
import { callAiService } from "@/lib/ai-client";
import { writeAuditLogAwait } from "@/lib/audit-log";
import { decryptCredentials } from "@/lib/crypto";
import { createEvidence } from "@/lib/evidence-mutations";
import { hashRawData } from "@/lib/queue/hash";
import {
  type CollectResponse,
  type CollectionJobPayload,
  type CollectedEvidenceItem,
} from "@/lib/queue/types";
import { uploadEvidenceFile } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function resolveSince(
  jobType: CollectionJobPayload["jobType"],
  lastSyncAt: Date | null
): string | null {
  if (jobType === "FULL") return null;
  return lastSyncAt?.toISOString() ?? null;
}

function normalizeJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

async function markJobFailed(params: {
  collectionJobId: string;
  integrationId: string;
  errorMessage: string;
}): Promise<void> {
  await prisma.collectionJob.update({
    where: { id: params.collectionJobId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: params.errorMessage,
    },
  });

  await prisma.integration.update({
    where: { id: params.integrationId },
    data: {
      lastSyncStatus: "error",
      errorMessage: params.errorMessage,
    },
  });
}

async function persistCollectedItem(params: {
  organizationId: string;
  integrationId: string;
  integrationType: string;
  item: CollectedEvidenceItem;
  controlRef: string;
  contentHash: string;
}): Promise<boolean> {
  const orgControl = await prisma.orgControl.findFirst({
    where: {
      organizationId: params.organizationId,
      frameworkControl: { controlRef: params.controlRef },
    },
    select: { id: true },
  });

  if (!orgControl) return false;

  const existing = await prisma.evidence.findFirst({
    where: {
      organizationId: params.organizationId,
      orgControlId: orgControl.id,
      fileHash: params.contentHash,
    },
    select: { id: true },
  });

  if (existing) return false;

  let s3Key: string | null = null;
  let mimeType = params.item.mime_type ?? null;

  if (params.item.file_content_b64) {
    const content = Buffer.from(params.item.file_content_b64, "base64");
    const fileName = `${params.integrationType}-${params.contentHash.slice(0, 8)}.${
      (mimeType ?? params.item.mime_type)?.includes("pdf") ? "pdf" : "bin"
    }`;
    const uploaded = await uploadEvidenceFile({
      orgId: params.organizationId,
      controlId: orgControl.id,
      fileName,
      content,
      mimeType: mimeType ?? "application/octet-stream",
    });
    s3Key = uploaded.s3Key;
    mimeType = mimeType ?? "application/octet-stream";
  }

  const collectedAt = new Date(params.item.collected_at);
  const expiresAt =
    params.item.expiry_days != null
      ? addDays(collectedAt, params.item.expiry_days)
      : null;

  const evidence = await createEvidence({
    organizationId: params.organizationId,
    orgControlId: orgControl.id,
    title: params.item.title,
    description: params.item.description,
    sourceType: EvidenceSource.INTEGRATION,
    integrationId: params.integrationId,
    s3Key,
    mimeType,
    fileHash: params.contentHash,
    collectedAt,
    expiresAt,
    evidenceType: params.item.evidence_type,
    metadata: params.item.raw_data as Prisma.InputJsonValue,
  });

  await writeAuditLogAwait({
    organizationId: params.organizationId,
    actorId: "system",
    action: "evidence.created",
    resourceType: "Evidence",
    resourceId: evidence.id,
    metadata: {
      integrationId: params.integrationId,
      integrationType: params.integrationType,
      controlRef: params.controlRef,
    },
  });

  return true;
}

export async function processCollectionJob(
  payload: CollectionJobPayload
): Promise<{ status: string; evidenceAdded: number; reason?: string }> {
  await prisma.collectionJob.update({
    where: { id: payload.collectionJobId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const integration = await prisma.integration.findFirst({
    where: {
      id: payload.integrationId,
      organizationId: payload.organizationId,
    },
  });

  if (!integration || integration.status !== IntegrationStatus.ACTIVE) {
    await markJobFailed({
      collectionJobId: payload.collectionJobId,
      integrationId: payload.integrationId,
      errorMessage: "Integration not active",
    });
    return { status: "skipped", evidenceAdded: 0, reason: "integration not active" };
  }

  let credentials: Record<string, unknown>;
  try {
    const parsed = JSON.parse(decryptCredentials(integration.encryptedCreds)) as unknown;
    credentials = normalizeJsonObject(parsed);
  } catch {
    await markJobFailed({
      collectionJobId: payload.collectionJobId,
      integrationId: integration.id,
      errorMessage: "Failed to decrypt integration credentials",
    });
    return { status: "error", evidenceAdded: 0, reason: "credential decrypt failed" };
  }

  const config = normalizeJsonObject(integration.config);

  let collectResponse: CollectResponse;
  try {
    collectResponse = await callAiService<CollectResponse>("/integrations/collect", {
      integration_type: integration.type,
      credentials,
      config,
      since: resolveSince(payload.jobType, integration.lastSyncAt),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Evidence collection request failed";
    await markJobFailed({
      collectionJobId: payload.collectionJobId,
      integrationId: integration.id,
      errorMessage: message,
    });
    throw err;
  }

  if (!collectResponse.valid) {
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        status: IntegrationStatus.ERROR,
        errorMessage: collectResponse.error ?? "Credential validation failed",
        lastSyncStatus: "error",
      },
    });
    await prisma.collectionJob.update({
      where: { id: payload.collectionJobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: collectResponse.error ?? "Credential validation failed",
      },
    });
    return {
      status: "error",
      evidenceAdded: 0,
      reason: collectResponse.error ?? "invalid credentials",
    };
  }

  let added = 0;

  for (const item of collectResponse.items) {
    const contentHash = hashRawData(item.raw_data);

    for (const controlRef of item.control_refs) {
      const created = await persistCollectedItem({
        organizationId: payload.organizationId,
        integrationId: integration.id,
        integrationType: integration.type,
        item,
        controlRef,
        contentHash,
      });
      if (created) added += 1;
    }
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncStatus:
        collectResponse.items.length > 0 && added === 0 ? "partial" : "success",
      lastSyncCount: added,
      errorMessage: null,
    },
  });

  await prisma.collectionJob.update({
    where: { id: payload.collectionJobId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      evidenceAdded: added,
      errorMessage: null,
    },
  });

  return { status: "completed", evidenceAdded: added };
}
