/** Parse a policy version path segment (positive integer). */
export function parsePolicyVersionParam(value: string): number | null {
  const version = Number.parseInt(value, 10);
  if (!Number.isFinite(version) || version < 1) {
    return null;
  }
  if (String(version) !== value.trim()) {
    return null;
  }
  return version;
}
