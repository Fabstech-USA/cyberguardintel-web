import { JobStatus } from "@/generated/prisma";
import { decryptCredentials } from "@/lib/crypto";
import { listEvidence } from "@/lib/evidence-queries";
import { toIntegrationPublicDto } from "@/lib/integration-api";
import {
  getCatalogEntry,
  getConnectHref,
} from "@/lib/integration-catalog";
import {
  buildSyncActivityBars,
  computeSuccessRate,
  extractSafeConfig,
  getNextScheduledSyncAt,
  toCollectionJobDto,
  type CollectionJobDto,
  type ControlCoverageRow,
  type SafeConfigEntry,
  type SyncActivityDay,
} from "@/lib/integration-detail";
import { prisma } from "@/lib/prisma";

export type IntegrationDetailDto = ReturnType<typeof toIntegrationPublicDto> & {
  authMethod: string | null;
  description: string | null;
  category: string | null;
  controls: string[];
  safeConfig: SafeConfigEntry[];
  reconnectHref: string | null;
};

export type IntegrationOverviewDto = {
  evidenceCount: number;
  lastSyncAt: string | null;
  nextSyncAt: string;
  successRate: number | null;
  controlsCovered: number;
  activity: SyncActivityDay[];
  controlCoverage: ControlCoverageRow[];
};

function parseCredentialsPreview(encryptedCreds: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(decryptCredentials(encryptedCreds)) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore decrypt failures — detail page still works without credential preview.
  }
  return {};
}

export async function getIntegrationForOrg(params: {
  organizationId: string;
  integrationId: string;
}) {
  return prisma.integration.findFirst({
    where: {
      id: params.integrationId,
      organizationId: params.organizationId,
    },
    include: {
      _count: {
        select: {
          evidence: { where: { isValid: true } },
        },
      },
    },
  });
}

export async function getIntegrationDetailDto(params: {
  organizationId: string;
  integrationId: string;
}): Promise<IntegrationDetailDto | null> {
  const integration = await getIntegrationForOrg(params);
  if (!integration) return null;

  const entry = getCatalogEntry(integration.type);
  const credentialsPreview = parseCredentialsPreview(integration.encryptedCreds);

  return {
    ...toIntegrationPublicDto(integration),
    authMethod: entry?.authMethod ?? null,
    description: entry?.description ?? null,
    category: entry?.category ?? null,
    controls: entry?.controls ?? [],
    safeConfig: extractSafeConfig(integration.config, credentialsPreview),
    reconnectHref: entry ? getConnectHref(entry) : null,
  };
}

export async function listIntegrationJobs(params: {
  organizationId: string;
  integrationId: string;
  days?: number;
}): Promise<CollectionJobDto[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (params.days ?? 30));

  const jobs = await prisma.collectionJob.findMany({
    where: {
      organizationId: params.organizationId,
      integrationId: params.integrationId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return jobs.map(toCollectionJobDto);
}

export async function getIntegrationOverview(params: {
  organizationId: string;
  integrationId: string;
}): Promise<IntegrationOverviewDto | null> {
  const integration = await getIntegrationForOrg(params);
  if (!integration) return null;

  const since14 = new Date();
  since14.setUTCDate(since14.getUTCDate() - 14);

  const [jobs, controlGroups] = await Promise.all([
    prisma.collectionJob.findMany({
      where: {
        organizationId: params.organizationId,
        integrationId: params.integrationId,
        createdAt: { gte: since14 },
        status: { in: [JobStatus.COMPLETED, JobStatus.FAILED] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        status: true,
        evidenceAdded: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    prisma.evidence.groupBy({
      by: ["orgControlId"],
      where: {
        organizationId: params.organizationId,
        integrationId: params.integrationId,
        isValid: true,
      },
      _count: { _all: true },
    }),
  ]);

  const orgControlIds = controlGroups.map((row) => row.orgControlId);
  const orgControls =
    orgControlIds.length === 0
      ? []
      : await prisma.orgControl.findMany({
          where: { id: { in: orgControlIds } },
          select: {
            id: true,
            frameworkControl: {
              select: { controlRef: true, title: true },
            },
          },
        });

  const controlById = new Map(
    orgControls.map((row) => [
      row.id,
      {
        controlRef: row.frameworkControl.controlRef,
        title: row.frameworkControl.title,
      },
    ])
  );

  const controlCoverage: ControlCoverageRow[] = controlGroups
    .map((row) => {
      const meta = controlById.get(row.orgControlId);
      return {
        controlRef: meta?.controlRef ?? "unknown",
        title: meta?.title ?? "Unknown control",
        count: row._count._all,
      };
    })
    .sort((a, b) => a.controlRef.localeCompare(b.controlRef));

  const entry = getCatalogEntry(integration.type);
  const coveredRefs = new Set(controlCoverage.map((row) => row.controlRef));
  const catalogControls = entry?.controls ?? [];
  const controlsCovered =
    catalogControls.length > 0
      ? catalogControls.filter((ref) => coveredRefs.has(ref)).length ||
        controlCoverage.length
      : controlCoverage.length;

  return {
    evidenceCount: integration._count.evidence,
    lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
    nextSyncAt: getNextScheduledSyncAt().toISOString(),
    successRate: computeSuccessRate(jobs),
    controlsCovered,
    activity: buildSyncActivityBars(jobs),
    controlCoverage,
  };
}

export async function listRecentIntegrationEvidence(params: {
  organizationId: string;
  integrationId: string;
  limit?: number;
}) {
  return listEvidence({
    organizationId: params.organizationId,
    integrationId: params.integrationId,
    limit: params.limit ?? 7,
  });
}
