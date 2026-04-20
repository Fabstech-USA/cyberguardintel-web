/** HIPAA safeguard families shown on the MVP dashboard (matches product mock). */
export const SAFEGUARD_BUCKETS = [
  "Administrative",
  "Physical",
  "Technical",
  "Organizational",
] as const;

export type SafeguardBucket = (typeof SAFEGUARD_BUCKETS)[number];

type ControlRow = {
  score: number;
  category: string;
};

/**
 * Map `FrameworkControl.category` (free-form string from seed/content) into one
 * of four dashboard buckets. Unknown values roll up to Administrative so the UI
 * always shows four bars.
 */
export function bucketForCategory(category: string): SafeguardBucket {
  const c = category.toLowerCase();
  if (c.includes("physical")) return "Physical";
  if (c.includes("technical")) return "Technical";
  if (c.includes("organizational")) return "Organizational";
  if (c.includes("administrative")) return "Administrative";
  return "Administrative";
}

/**
 * Per-bucket score: average of `OrgControl.score` for controls in that bucket.
 * Empty bucket → 0. Display as 0–100 to match readiness mock.
 */
export function aggregateSafeguardScores(
  controls: ControlRow[]
): Record<SafeguardBucket, number> {
  const sums: Record<SafeguardBucket, { total: number; n: number }> = {
    Administrative: { total: 0, n: 0 },
    Physical: { total: 0, n: 0 },
    Technical: { total: 0, n: 0 },
    Organizational: { total: 0, n: 0 },
  };

  for (const row of controls) {
    const bucket = bucketForCategory(row.category);
    sums[bucket].total += row.score;
    sums[bucket].n += 1;
  }

  const out = {} as Record<SafeguardBucket, number>;
  for (const key of SAFEGUARD_BUCKETS) {
    const { total, n } = sums[key];
    out[key] = n === 0 ? 0 : Math.round(total / n);
  }
  return out;
}
