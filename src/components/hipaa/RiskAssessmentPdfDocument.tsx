"use client";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import type { RiskAssessment } from "@/generated/prisma";
import type { ThreatItem } from "@/lib/ai-risk-assessment";
import {
  RISK_LEVEL_LABEL,
  aiLevelFromPrisma,
} from "./risk-assessment-result/risk-display";
import { categoryFromControls } from "./risk-assessment-result/threat-category";

type Recommendations = {
  executive_summary?: string;
  immediate?: string[];
  long_term?: string[];
};

type Vulnerability = { description: string };

const styles = StyleSheet.create({
  page: {
    paddingVertical: 48,
    paddingHorizontal: 56,
    fontSize: 10,
    color: "#111827",
    fontFamily: "Helvetica",
  },
  cover: {
    paddingVertical: 80,
    paddingHorizontal: 56,
    color: "#111827",
    fontFamily: "Helvetica",
  },
  coverEyebrow: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#6b7280",
    marginBottom: 8,
  },
  coverOrg: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 6,
  },
  coverTitle: {
    fontSize: 18,
    color: "#374151",
    marginBottom: 32,
  },
  coverMeta: {
    fontSize: 11,
    color: "#374151",
    marginBottom: 4,
  },
  coverFooter: {
    position: "absolute",
    left: 56,
    right: 56,
    bottom: 48,
    fontSize: 9,
    color: "#6b7280",
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
    marginTop: 18,
    color: "#111827",
  },
  body: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#1f2937",
  },
  subtle: {
    fontSize: 9,
    color: "#6b7280",
  },
  threatCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  threatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  threatName: {
    fontSize: 11,
    fontWeight: 700,
    color: "#111827",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  pill: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#f3f4f6",
    color: "#374151",
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bulletNum: {
    width: 18,
    color: "#6b7280",
  },
  pageNumber: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    color: "#9ca3af",
  },
});

function asThreats(value: unknown): ThreatItem[] {
  return Array.isArray(value) ? (value as ThreatItem[]) : [];
}
function asRecommendations(value: unknown): Recommendations {
  if (!value || typeof value !== "object") return {};
  return value as Recommendations;
}
function asVulnerabilities(value: unknown): Vulnerability[] {
  return Array.isArray(value) ? (value as Vulnerability[]) : [];
}

type Props = {
  assessment: RiskAssessment;
  organizationName: string;
  approvedByName: string | null;
};

export function RiskAssessmentPdfDocument({
  assessment,
  organizationName,
  approvedByName,
}: Props): React.JSX.Element {
  const overall = aiLevelFromPrisma(assessment.riskLevel);
  const threats = asThreats(assessment.threats);
  const recs = asRecommendations(assessment.recommendations);
  const vulns = asVulnerabilities(assessment.vulnerabilities);
  const generatedOn = format(new Date(assessment.createdAt), "MMMM d, yyyy");
  const approvedOn = assessment.approvedAt
    ? format(new Date(assessment.approvedAt), "MMMM d, yyyy")
    : null;

  return (
    <Document>
      <Page size="LETTER" style={styles.cover}>
        <Text style={styles.coverEyebrow}>HIPAA Security Risk Analysis</Text>
        <Text style={styles.coverOrg}>{organizationName}</Text>
        <Text style={styles.coverTitle}>Annual assessment per 45 CFR 164.308(a)(1)</Text>

        <Text style={styles.coverMeta}>Version {assessment.version}</Text>
        <Text style={styles.coverMeta}>Generated {generatedOn}</Text>
        <Text style={styles.coverMeta}>
          Status: {assessment.status === "APPROVED" ? "Approved" : "Draft"}
          {approvedByName && approvedOn
            ? ` (by ${approvedByName} on ${approvedOn})`
            : ""}
        </Text>
        <Text style={styles.coverMeta}>Overall risk: {RISK_LEVEL_LABEL[overall]}</Text>

        <Text style={styles.coverFooter}>
          AI-generated draft. Confidential - do not distribute outside the
          organization without legal review.
        </Text>
      </Page>

      <Page size="LETTER" style={styles.page} wrap>
        <Text style={styles.sectionHeading}>Executive summary</Text>
        <Text style={styles.body}>
          {recs.executive_summary ?? "No summary provided."}
        </Text>

        <Text style={styles.sectionHeading}>Scope</Text>
        <Text style={styles.body}>{assessment.scope}</Text>

        <Text style={styles.sectionHeading}>Identified threats</Text>
        {threats.length === 0 ? (
          <Text style={styles.subtle}>No threats returned by the AI service.</Text>
        ) : (
          threats.map((t, idx) => (
            <View
              key={`${t.threat_name}-${idx}`}
              style={styles.threatCard}
              wrap={false}
            >
              <View style={styles.threatHeader}>
                <Text style={styles.threatName}>{t.threat_name}</Text>
                <Text style={styles.pill}>
                  {categoryFromControls(t.controls_affected)}
                </Text>
              </View>
              <View style={styles.pillRow}>
                <Text style={styles.pill}>Source: {t.threat_source}</Text>
                <Text style={styles.pill}>Likelihood: {t.likelihood}</Text>
                <Text style={styles.pill}>Impact: {t.impact}</Text>
                <Text style={styles.pill}>Overall: {t.overall_risk}</Text>
              </View>
              <Text style={styles.body}>
                <Text style={{ fontWeight: 700 }}>Current controls. </Text>
                {t.current_controls}
              </Text>
              <Text style={[styles.body, { marginTop: 4 }]}>
                <Text style={{ fontWeight: 700 }}>Recommendation. </Text>
                {t.recommendation}
              </Text>
              {t.controls_affected.length > 0 && (
                <Text style={[styles.subtle, { marginTop: 4 }]}>
                  Controls affected: {t.controls_affected.join(", ")}
                </Text>
              )}
            </View>
          ))
        )}

        {vulns.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Critical gaps</Text>
            {vulns.map((v, idx) => (
              <View key={idx} style={styles.bulletRow} wrap={false}>
                <Text style={styles.bulletNum}>-</Text>
                <Text style={styles.body}>{v.description}</Text>
              </View>
            ))}
          </>
        )}

        {recs.immediate && recs.immediate.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Immediate actions (next 30 days)</Text>
            {recs.immediate.map((item, idx) => (
              <View key={idx} style={styles.bulletRow} wrap={false}>
                <Text style={styles.bulletNum}>{idx + 1}.</Text>
                <Text style={styles.body}>{item}</Text>
              </View>
            ))}
          </>
        )}

        {recs.long_term && recs.long_term.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Long-term actions</Text>
            {recs.long_term.map((item, idx) => (
              <View key={idx} style={styles.bulletRow} wrap={false}>
                <Text style={styles.bulletNum}>{idx + 1}.</Text>
                <Text style={styles.body}>{item}</Text>
              </View>
            ))}
          </>
        )}

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
