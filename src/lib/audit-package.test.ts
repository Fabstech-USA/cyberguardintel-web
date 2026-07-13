import { beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { PolicyStatus } from "@/generated/prisma";

const {
  organizationFindUniqueOrThrowMock,
  evidenceFindManyMock,
  policyFindManyMock,
  riskAssessmentFindFirstMock,
  baaRecordFindManyMock,
  trainingRecordFindManyMock,
  phiSystemFindManyMock,
  phiFlowEdgeFindManyMock,
  auditLogFindManyMock,
  getObjectFromS3Mock,
  putObjectToS3Mock,
  renderRiskAssessmentPdfBufferMock,
} = vi.hoisted(() => ({
  organizationFindUniqueOrThrowMock: vi.fn(),
  evidenceFindManyMock: vi.fn(),
  policyFindManyMock: vi.fn(),
  riskAssessmentFindFirstMock: vi.fn(),
  baaRecordFindManyMock: vi.fn(),
  trainingRecordFindManyMock: vi.fn(),
  phiSystemFindManyMock: vi.fn(),
  phiFlowEdgeFindManyMock: vi.fn(),
  auditLogFindManyMock: vi.fn(),
  getObjectFromS3Mock: vi.fn(),
  putObjectToS3Mock: vi.fn(),
  renderRiskAssessmentPdfBufferMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUniqueOrThrow: organizationFindUniqueOrThrowMock },
    evidence: { findMany: evidenceFindManyMock },
    policy: { findMany: policyFindManyMock },
    riskAssessment: { findFirst: riskAssessmentFindFirstMock },
    baaRecord: { findMany: baaRecordFindManyMock },
    trainingRecord: { findMany: trainingRecordFindManyMock },
    phiSystem: { findMany: phiSystemFindManyMock },
    phiFlowEdge: { findMany: phiFlowEdgeFindManyMock },
    auditLog: { findMany: auditLogFindManyMock },
  },
}));

vi.mock("@/lib/s3", () => ({
  getObjectFromS3: getObjectFromS3Mock,
  putObjectToS3: putObjectToS3Mock,
}));

vi.mock("@/lib/render-risk-assessment-pdf", () => ({
  renderRiskAssessmentPdfBuffer: renderRiskAssessmentPdfBufferMock,
}));

import {
  auditPackageS3Key,
  buildAndUploadAuditPackage,
  buildAuditPackageReadme,
  escapeCsvValue,
  rowsToCsv,
  safeZipFileName,
} from "@/lib/audit-package";

describe("audit-package helpers", () => {
  it("escapes CSV values", () => {
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvValue("a,b")).toBe('"a,b"');
    expect(escapeCsvValue(null)).toBe("");
  });

  it("builds CSV rows", () => {
    const csv = rowsToCsv(["name", "n"], [{ name: "Acme", n: 1 }]);
    expect(csv).toBe("name,n\nAcme,1\n");
  });

  it("sanitizes zip file names", () => {
    expect(safeZipFileName("164.312(a)/file.pdf")).toBe("164.312_a_file.pdf");
  });

  it("builds README with APPROVED-only notes", () => {
    const md = buildAuditPackageReadme({
      organizationName: "Clinic",
      exportedAt: new Date("2026-07-12T12:00:00.000Z"),
      from: new Date("2025-01-01T00:00:00.000Z"),
      to: new Date("2026-01-01T00:00:00.000Z"),
      controlRefs: ["164.312(a)(1)"],
      evidenceCount: 2,
      evidenceSkipped: 1,
      policyCount: 3,
      hasRiskAssessment: true,
      baaCount: 4,
      trainingCount: 5,
      phiSystemCount: 4,
      phiEdgeCount: 3,
      auditLogCount: 6,
    });
    expect(md).toContain("Clinic");
    expect(md).toContain("APPROVED");
    expect(md).toContain("164.312(a)(1)");
    expect(md).toContain("2 included");
    expect(md).toContain("PHI systems");
  });

  it("builds S3 key with date and job id", () => {
    expect(
      auditPackageS3Key("org_1", "job_1", new Date("2026-07-12T15:00:00Z"))
    ).toBe("orgs/org_1/audit-packages/2026-07-12-job_1.zip");
  });
});

describe("buildAndUploadAuditPackage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    organizationFindUniqueOrThrowMock.mockResolvedValue({
      id: "org_1",
      name: "Clinic",
    });
    evidenceFindManyMock.mockResolvedValue([
      {
        id: "ev_1",
        title: "Access review",
        s3Key: "orgs/org_1/controls/oc_1/hash-access.pdf",
        mimeType: "application/pdf",
        collectedAt: new Date("2026-01-15"),
        orgControl: {
          frameworkControl: { controlRef: "164.308(a)(1)" },
        },
      },
      {
        id: "ev_2",
        title: "No file",
        s3Key: null,
        mimeType: null,
        collectedAt: new Date("2026-01-16"),
        orgControl: {
          frameworkControl: { controlRef: "164.308(a)(1)" },
        },
      },
    ]);
    policyFindManyMock.mockResolvedValue([
      {
        id: "pol_1",
        type: "ACCESS_CONTROL",
        version: 2,
        sourceS3Key: "hipaa/policies/org_1/pol_1-v2-approved.pdf",
        title: "Access Control",
      },
    ]);
    riskAssessmentFindFirstMock.mockResolvedValue({
      id: "ra_1",
      version: 1,
      status: PolicyStatus.APPROVED,
      organizationId: "org_1",
      scope: "EHR",
      threats: [],
      vulnerabilities: [],
      recommendations: {},
      riskLevel: "MEDIUM",
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedAt: new Date(),
      approvedById: "user_1",
      conductedById: "user_1",
      aiGenerated: true,
    });
    baaRecordFindManyMock.mockResolvedValue([
      {
        id: "baa_1",
        vendorName: "AWS",
        vendorEmail: "a@example.com",
        services: "Hosting",
        status: "SIGNED",
        signedAt: new Date("2025-06-01"),
        expiresAt: new Date("2026-06-01"),
        notes: null,
      },
    ]);
    trainingRecordFindManyMock.mockResolvedValue([
      {
        id: "tr_1",
        employeeId: "e1",
        employeeName: "Ada",
        employeeEmail: "ada@example.com",
        employeeJobTitle: "MD",
        trainingTitle: "HIPAA Basics",
        completedAt: new Date("2025-05-01"),
        nextDueAt: new Date("2026-05-01"),
      },
    ]);
    phiSystemFindManyMock.mockResolvedValue([
      {
        id: "phi_1",
        name: "Epic EHR",
        systemType: "emr",
        containsPhi: true,
        phiTypes: ["demographics"],
        encryptionAtRest: true,
        encryptionInTransit: true,
        baaRecordId: null,
        description: "Primary EHR",
      },
    ]);
    phiFlowEdgeFindManyMock.mockResolvedValue([
      {
        id: "edge_1",
        isExternalVendorFlow: false,
        dataClassification: "PHI",
        sourcePhiSystem: { name: "Epic EHR" },
        targetPhiSystem: { name: "Billing" },
        targetIntegration: null,
        viaIntegration: null,
        baaRecord: null,
      },
    ]);
    auditLogFindManyMock.mockResolvedValue([
      {
        id: "al_1",
        actorId: "user_1",
        actorEmail: "u@example.com",
        action: "policy.approved",
        resourceType: "Policy",
        resourceId: "pol_1",
        ipAddress: "1.1.1.1",
        createdAt: new Date("2026-01-10"),
      },
    ]);
    getObjectFromS3Mock.mockImplementation(async (key: string) => ({
      body: Buffer.from(`body:${key}`),
      contentType: "application/pdf",
      metadata: undefined,
    }));
    renderRiskAssessmentPdfBufferMock.mockResolvedValue(
      Buffer.from("%PDF-risk")
    );
    putObjectToS3Mock.mockResolvedValue(undefined);
  });

  it("uploads a ZIP with expected artifacts and APPROVED-only queries", async () => {
    const result = await buildAndUploadAuditPackage({
      organizationId: "org_1",
      exportJobId: "job_1",
      from: new Date("2025-01-01T00:00:00.000Z"),
      to: new Date("2026-07-01T00:00:00.000Z"),
      controlRefs: ["164.308(a)(1)"],
    });

    expect(result.evidenceCount).toBe(1);
    expect(result.evidenceSkipped).toBe(1);
    expect(result.policyCount).toBe(1);
    expect(result.hasRiskAssessment).toBe(true);
    expect(result.baaCount).toBe(1);
    expect(result.trainingCount).toBe(1);
    expect(result.phiSystemCount).toBe(1);
    expect(result.phiEdgeCount).toBe(1);
    expect(result.auditLogCount).toBe(1);
    expect(result.s3Key).toMatch(/^orgs\/org_1\/audit-packages\/.+-job_1\.zip$/);

    expect(policyFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PolicyStatus.APPROVED,
        }),
      })
    );
    expect(riskAssessmentFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PolicyStatus.APPROVED,
        }),
      })
    );

    expect(putObjectToS3Mock).toHaveBeenCalledTimes(1);
    const [, zipBody, contentType] = putObjectToS3Mock.mock.calls[0];
    expect(contentType).toBe("application/zip");

    const zip = await JSZip.loadAsync(zipBody as Buffer);
    const names = Object.keys(zip.files).sort();
    expect(names).toContain("README.md");
    expect(names).toContain("baa-inventory.csv");
    expect(names).toContain("training-records.csv");
    expect(names).toContain("phi-systems.csv");
    expect(names).toContain("phi-flow-edges.csv");
    expect(names).toContain("audit-log.csv");
    expect(names).toContain("risk-assessment/risk-assessment-v1.pdf");
    expect(names).toContain("policies/ACCESS_CONTROL-v2.pdf");
    expect(names.some((n) => n.startsWith("evidence/"))).toBe(true);

    const readme = await zip.file("README.md")!.async("string");
    expect(readme).toContain("APPROVED");

    const baa = await zip.file("baa-inventory.csv")!.async("string");
    expect(baa).toContain("AWS");
  });

  it("omits risk assessment when none is APPROVED", async () => {
    riskAssessmentFindFirstMock.mockResolvedValue(null);

    const result = await buildAndUploadAuditPackage({
      organizationId: "org_1",
      exportJobId: "job_2",
      from: new Date("2025-01-01T00:00:00.000Z"),
      to: new Date("2026-07-01T00:00:00.000Z"),
    });

    expect(result.hasRiskAssessment).toBe(false);
    const [, zipBody] = putObjectToS3Mock.mock.calls[0];
    const zip = await JSZip.loadAsync(zipBody as Buffer);
    expect(zip.file("risk-assessment/risk-assessment-v1.pdf")).toBeNull();
  });
});
