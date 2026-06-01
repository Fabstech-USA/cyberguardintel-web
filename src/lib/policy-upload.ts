import mammoth from "mammoth";

import { extractPdfPolicyText } from "@/lib/policy-pdf-extract";
import { normalizePolicyMarkdown } from "@/lib/normalize-policy-markdown";
import {
  POLICY_UPLOAD_MIN_CONTENT_LENGTH,
  PolicyUploadError,
  type PolicyUploadKind,
} from "@/lib/policy-upload-shared";

export {
  POLICY_UPLOAD_ACCEPT,
  POLICY_UPLOAD_MIN_CONTENT_LENGTH,
  PolicyUploadError,
  buildPolicySourceS3Key,
  defaultPolicyUploadMimeType,
  detectPolicyUploadKind,
  sanitizePolicyFileName,
  type PolicyUploadKind,
} from "@/lib/policy-upload-shared";

export async function extractPolicyText(
  bytes: Uint8Array,
  kind: PolicyUploadKind
): Promise<string> {
  if (bytes.length === 0) {
    throw new PolicyUploadError("EMPTY_FILE", "Uploaded file is empty.");
  }

  try {
    switch (kind) {
      case "markdown":
      case "text":
        return new TextDecoder("utf-8").decode(bytes).trim();
      case "docx": {
        const result = await mammoth.extractRawText({
          buffer: Buffer.from(bytes),
        });
        return result.value.trim();
      }
      case "pdf":
        return extractPdfPolicyText(bytes);
      default:
        throw new PolicyUploadError(
          "UNSUPPORTED_TYPE",
          "Unsupported file type."
        );
    }
  } catch (err) {
    if (err instanceof PolicyUploadError) throw err;
    throw new PolicyUploadError(
      "EXTRACTION_FAILED",
      err instanceof Error ? err.message : "Could not extract policy text."
    );
  }
}

export async function prepareUploadedPolicyContent(
  bytes: Uint8Array,
  kind: PolicyUploadKind
): Promise<string> {
  const raw = await extractPolicyText(bytes, kind);
  if (raw.length < POLICY_UPLOAD_MIN_CONTENT_LENGTH) {
    throw new PolicyUploadError(
      "EXTRACTION_FAILED",
      "Could not extract enough text from the uploaded file. Try a Markdown or Word document with selectable text."
    );
  }
  return normalizePolicyMarkdown(raw);
}
