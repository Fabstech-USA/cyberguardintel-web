export const POLICY_UPLOAD_MIN_CONTENT_LENGTH = 10;

export const POLICY_UPLOAD_ACCEPT =
  ".md,.txt,.docx,.pdf,text/markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type PolicyUploadKind = "markdown" | "text" | "docx" | "pdf";

export class PolicyUploadError extends Error {
  constructor(
    readonly code: "UNSUPPORTED_TYPE" | "EMPTY_FILE" | "EXTRACTION_FAILED",
    message: string
  ) {
    super(message);
    this.name = "PolicyUploadError";
  }
}

export function sanitizePolicyFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function detectPolicyUploadKind(
  fileName: string,
  mimeType: string
): PolicyUploadKind | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".txt")) return "text";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".pdf")) return "pdf";

  const mime = mimeType.toLowerCase();
  if (mime === "text/markdown") return "markdown";
  if (mime === "text/plain") return "text";
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (mime === "application/pdf") return "pdf";

  return null;
}

export function buildPolicySourceS3Key(
  organizationId: string,
  fileName: string
): string {
  const safeName = sanitizePolicyFileName(fileName || "policy-upload");
  return `hipaa/policies/${organizationId}/${crypto.randomUUID()}-${safeName || "policy-upload"}`;
}

export function defaultPolicyUploadMimeType(kind: PolicyUploadKind): string {
  switch (kind) {
    case "markdown":
      return "text/markdown";
    case "text":
      return "text/plain";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "pdf":
      return "application/pdf";
  }
}
