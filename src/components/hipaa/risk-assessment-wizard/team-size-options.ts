// Mirrors the team-size buckets in src/components/onboarding/OrgDetailsStep.tsx
// so the risk-assessment wizard's edit dropdown maps to the same canonical
// employeeCount integers the rest of the app uses.

export const TEAM_SIZE_OPTIONS = [
  { value: "1-15", label: "1-15", employeeCount: 15 },
  { value: "16-50", label: "16-50", employeeCount: 50 },
  { value: "51-100", label: "51-100", employeeCount: 100 },
  { value: "101-300", label: "101-300", employeeCount: 300 },
  { value: "300+", label: "300+", employeeCount: 500 },
] as const;

export type TeamSizeValue = (typeof TEAM_SIZE_OPTIONS)[number]["value"];

export function bucketLabelForEmployeeCount(count: number | null): string {
  if (count == null) return "Not specified";
  if (count <= 15) return "1-15";
  if (count <= 50) return "16-50";
  if (count <= 100) return "51-100";
  if (count <= 300) return "101-300";
  return "300+";
}
