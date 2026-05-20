/**
 * Policy `version` (integer, shown as v1, v2, …) tracks **published document revisions**,
 * not every keystroke or workflow step.
 *
 * | Event | Version changes? |
 * |-------|------------------|
 * | First AI generate or first save | Starts at **v1** |
 * | Re-run **Generate** for the same policy type (AI upsert) | **+1** (v1 → v2, …) |
 * | Manual **Save** in the editor | **No** (same version; content updated in place) |
 * | Status change (draft → under review, archive, etc.) | **No** |
 * | **Approve** | **+1** (snapshot saved to PolicyVersion at pre-increment version) |
 *
 * Approved revisions are listed in version history; the live policy row holds the
 * current working revision number after approval.
 */

export function formatPolicyVersion(version: number): string {
  return `v${version}`;
}
