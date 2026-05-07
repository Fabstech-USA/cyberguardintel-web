"use client";

import dynamic from "next/dynamic";
import { Download } from "lucide-react";
import type { RiskAssessment } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { RiskAssessmentPdfDocument } from "./RiskAssessmentPdfDocument";

// PDFDownloadLink ships pdfkit + buffer polyfills that don't SSR cleanly,
// so we load it client-only. Disable SSR to avoid hydration mismatches.
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false }
);

type Props = {
  assessment: RiskAssessment;
  organizationName: string;
  approvedByName: string | null;
};

function buildFileName(
  organizationName: string,
  version: number,
  createdAt: Date
): string {
  const safeOrg = organizationName.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  const datePart = new Date(createdAt).toISOString().slice(0, 10);
  const orgPart = safeOrg.length > 0 ? safeOrg : "organization";
  return `${orgPart}-risk-assessment-v${version}-${datePart}.pdf`;
}

export function DownloadPdfButton({
  assessment,
  organizationName,
  approvedByName,
}: Props): React.JSX.Element {
  const fileName = buildFileName(
    organizationName,
    assessment.version,
    new Date(assessment.createdAt)
  );

  return (
    <PDFDownloadLink
      document={
        <RiskAssessmentPdfDocument
          assessment={assessment}
          organizationName={organizationName}
          approvedByName={approvedByName}
        />
      }
      fileName={fileName}
    >
      {({ loading }) => (
        <Button type="button" variant="outline" disabled={loading}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          {loading ? "Preparing PDF..." : "Download PDF"}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
