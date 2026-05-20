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
 * | **Approve** | **No** (locks approval metadata; same version number) |
 *
 * To get a new version after manual edits, use **Generate** again (AI overwrite) or
 * we can add an explicit "Save as new version" later.
 */

export function formatPolicyVersion(version: number): string {
  return `v${version}`;
}
