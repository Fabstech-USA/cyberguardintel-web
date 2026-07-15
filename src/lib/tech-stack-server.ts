/**
 * Server-only tech-stack persistence / merge helpers.
 * Import pure formatters/mappers from `@/lib/tech-stack` in Client Components.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  integrationTypeToTechStackSlug,
  onboardingPhiSlugToTechStackSlug,
  phiSystemToTechStackSlug,
  uniqueSortedTechStack,
} from "@/lib/tech-stack";

async function appendTechStackSlugs(
  organizationId: string,
  slugs: string[]
): Promise<void> {
  const toAdd = uniqueSortedTechStack(slugs);
  if (toAdd.length === 0) return;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { techStack: true },
  });
  if (!org) return;

  const existing = new Set(org.techStack);
  const missing = toAdd.filter((slug) => !existing.has(slug));
  if (missing.length === 0) return;

  await prisma.organization.update({
    where: { id: organizationId },
    data: { techStack: uniqueSortedTechStack([...org.techStack, ...missing]) },
  });
}

/**
 * Add a connected integration's tool to Organization.techStack if missing.
 * No-op when the type does not map to a stack slug.
 */
export async function addIntegrationToOrgTechStack(
  organizationId: string,
  integrationType: string
): Promise<void> {
  const slug = integrationTypeToTechStackSlug(integrationType);
  if (!slug) return;
  await appendTechStackSlugs(organizationId, [slug]);
}

/** Add recognizable PHI systems (onboarding presets or named systems) to tech stack. */
export async function addPhiSystemsToOrgTechStack(
  organizationId: string,
  inputs: Array<{
    name?: string;
    systemType?: string | null;
    onboardingSlug?: string;
  }>
): Promise<void> {
  const slugs = inputs
    .map((input) => {
      if (input.onboardingSlug) {
        return onboardingPhiSlugToTechStackSlug(input.onboardingSlug);
      }
      if (input.name) {
        return phiSystemToTechStackSlug({
          name: input.name,
          systemType: input.systemType,
        });
      }
      return null;
    })
    .filter((slug): slug is string => Boolean(slug));

  await appendTechStackSlugs(organizationId, slugs);
}

/**
 * Declared tech stack ∪ connected integrations ∪ recognizable PHI systems.
 * Used for settings display and AI context.
 */
export async function getMergedOrgTechStack(
  organizationId: string
): Promise<string[]> {
  const [org, integrations, phiSystems] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { techStack: true },
    }),
    prisma.integration.findMany({
      where: {
        organizationId,
        status: { in: ["ACTIVE", "PAUSED", "ERROR"] },
      },
      select: { type: true },
    }),
    prisma.phiSystem.findMany({
      where: { organizationId },
      select: { name: true, systemType: true },
    }),
  ]);

  const declared = org?.techStack ?? [];
  const fromIntegrations = integrations
    .map((row) => integrationTypeToTechStackSlug(row.type))
    .filter((slug): slug is string => Boolean(slug));
  const fromPhi = phiSystems
    .map((row) =>
      phiSystemToTechStackSlug({ name: row.name, systemType: row.systemType })
    )
    .filter((slug): slug is string => Boolean(slug));

  return uniqueSortedTechStack([...declared, ...fromIntegrations, ...fromPhi]);
}
