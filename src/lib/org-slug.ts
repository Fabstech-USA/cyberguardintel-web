import { prisma } from "@/lib/prisma";

export function slugify(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.length > 0 ? cleaned.slice(0, 48) : "org";
}

/**
 * Picks a globally unique `Organization.slug` not used by another `clerkOrgId`.
 */
export async function generateUniqueSlug(
  name: string,
  clerkOrgId: string
): Promise<string> {
  const base = slugify(name);

  const taken = await prisma.organization.findMany({
    where: {
      slug: { startsWith: base },
      NOT: { clerkOrgId },
    },
    select: { slug: true },
  });
  const usedSlugs = new Set(taken.map((o) => o.slug));

  if (!usedSlugs.has(base)) return base;

  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base}-${i}`;
    if (!usedSlugs.has(candidate)) return candidate;
  }

  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}
