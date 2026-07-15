// Shared limits for user file uploads (evidence, BAAs, policies).
// Files are buffered in memory before hitting S3, so the cap also protects the server.

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export const MAX_UPLOAD_LABEL = "25 MB";

/**
 * MIME types that browsers may execute or render as active content.
 * Stored evidence is served back with its original type, so these are rejected
 * at upload even though downloads use `attachment` + `nosniff`.
 */
const ACTIVE_CONTENT_MIME_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
]);

export function isActiveContentMimeType(mimeType: string): boolean {
  const normalized = mimeType.split(";")[0].trim().toLowerCase();
  return ACTIVE_CONTENT_MIME_TYPES.has(normalized);
}

/** Size check that works on File-like objects before buffering the body. */
export function uploadTooLarge(file: unknown, bufferedLength?: number): boolean {
  if (typeof bufferedLength === "number" && bufferedLength > MAX_UPLOAD_BYTES) {
    return true;
  }
  if (
    file &&
    typeof file === "object" &&
    "size" in file &&
    typeof (file as { size: unknown }).size === "number"
  ) {
    return (file as { size: number }).size > MAX_UPLOAD_BYTES;
  }
  return false;
}
