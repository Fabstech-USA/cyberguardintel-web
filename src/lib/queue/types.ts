export const QUEUE_NAME = "evidence-collection";

export const COLLECT_JOB_NAME = "collect";

export const AUDIT_EXPORT_QUEUE_NAME = "audit-export";

export const AUDIT_PACKAGE_JOB_NAME = "package";

export type CollectionJobType = "FULL" | "INCREMENTAL";

export type CollectionJobPayload = {
  collectionJobId: string;
  organizationId: string;
  integrationId: string;
  jobType: CollectionJobType;
};

export type AuditExportJobPayload = {
  auditExportJobId: string;
  organizationId: string;
  from: string;
  to: string;
  controlRefs: string[];
  sections: string[];
};

export type CollectedEvidenceItem = {
  title: string;
  description: string;
  control_refs: string[];
  evidence_type: string;
  raw_data: Record<string, unknown>;
  collected_at: string;
  source_url?: string | null;
  file_content_b64?: string | null;
  mime_type?: string | null;
  expiry_days?: number | null;
};

export type CollectResponse = {
  valid: boolean;
  items: CollectedEvidenceItem[];
  error?: string | null;
};
