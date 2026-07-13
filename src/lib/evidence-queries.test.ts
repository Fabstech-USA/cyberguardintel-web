import { describe, expect, it } from "vitest";
import { EvidenceSource } from "@/generated/prisma";

import {
  buildEvidenceWhere,
  decodeEvidenceCursor,
  encodeEvidenceCursor,
} from "@/lib/evidence-list-filters";
import { getEvidenceSourceBadge } from "@/lib/evidence-source";

describe("evidence-list-filters", () => {
  it("encodes and decodes cursors", () => {
    const cursor = encodeEvidenceCursor({
      collectedAt: "2026-06-18T12:00:00.000Z",
      id: "ev_1",
    });
    expect(decodeEvidenceCursor(cursor)).toEqual({
      collectedAt: "2026-06-18T12:00:00.000Z",
      id: "ev_1",
    });
  });

  it("buildEvidenceWhere scopes by organization and source", () => {
    const where = buildEvidenceWhere({
      organizationId: "org_1",
      source: "aws",
      q: "IAM",
    });

    expect(where).toEqual({
      AND: [
        { organizationId: "org_1", isValid: true },
        {
          sourceType: EvidenceSource.INTEGRATION,
          integration: { type: { in: ["aws", "demo-aws"] } },
        },
        {
          OR: [
            { title: { contains: "IAM", mode: "insensitive" } },
            {
              orgControl: {
                frameworkControl: {
                  controlRef: { contains: "IAM", mode: "insensitive" },
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("buildEvidenceWhere includes demo google-workspace type for Google chip", () => {
    const where = buildEvidenceWhere({
      organizationId: "org_1",
      source: "google-workspace",
    });
    expect(where).toEqual({
      AND: [
        { organizationId: "org_1", isValid: true },
        {
          sourceType: EvidenceSource.INTEGRATION,
          integration: {
            type: { in: ["google-workspace", "demo-google-workspace"] },
          },
        },
      ],
    });
  });

  it("buildEvidenceWhere prefers integrationId over source type", () => {
    const where = buildEvidenceWhere({
      organizationId: "org_1",
      integrationId: "int_aws",
      source: "aws",
    });
    expect(where).toEqual({
      AND: [
        { organizationId: "org_1", isValid: true },
        {
          sourceType: EvidenceSource.INTEGRATION,
          integrationId: "int_aws",
        },
      ],
    });
  });

  it("buildEvidenceWhere filters by controlRefs list", () => {
    const where = buildEvidenceWhere({
      organizationId: "org_1",
      controlRefs: ["164.308(a)(1)", "164.312(a)(1)"],
      controlRef: "ignored-when-refs-present",
    });
    expect(where).toEqual({
      AND: [
        { organizationId: "org_1", isValid: true },
        {
          orgControl: {
            frameworkControl: {
              controlRef: { in: ["164.308(a)(1)", "164.312(a)(1)"] },
            },
          },
        },
      ],
    });
  });
});

describe("getEvidenceSourceBadge", () => {
  it("maps manual and integration sources", () => {
    expect(
      getEvidenceSourceBadge({ sourceType: EvidenceSource.MANUAL }).label
    ).toBe("Manual");
    expect(
      getEvidenceSourceBadge({
        sourceType: EvidenceSource.INTEGRATION,
        integration: { type: "okta", displayName: "Okta Prod" },
      }).label
    ).toBe("Okta");
  });
});
