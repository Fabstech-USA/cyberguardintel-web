import { describe, expect, it } from "vitest";

import {
  PolicyUploadError,
  buildPolicySourceS3Key,
  detectPolicyUploadKind,
  sanitizePolicyFileName,
} from "@/lib/policy-upload-shared";
import {
  extractPolicyText,
  prepareUploadedPolicyContent,
} from "@/lib/policy-upload";

describe("policy-upload", () => {
  it("detects upload kinds from extension and mime", () => {
    expect(detectPolicyUploadKind("policy.md", "text/plain")).toBe("markdown");
    expect(detectPolicyUploadKind("notes.txt", "")).toBe("text");
    expect(
      detectPolicyUploadKind(
        "policy.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe("docx");
    expect(detectPolicyUploadKind("scan.pdf", "application/pdf")).toBe("pdf");
    expect(detectPolicyUploadKind("image.png", "image/png")).toBeNull();
  });

  it("sanitizes unsafe file names for S3 keys", () => {
    expect(sanitizePolicyFileName("My Policy (Final).PDF")).toBe(
      "my-policy-final-.pdf"
    );
  });

  it("builds tenant-scoped S3 keys", () => {
    const key = buildPolicySourceS3Key("org_123", "Access Control.docx");
    expect(key).toMatch(/^hipaa\/policies\/org_123\/[0-9a-f-]+-access-control.docx$/);
  });

  it("extracts markdown and plain text", async () => {
    const md = new TextEncoder().encode("# Access Control\n\nBody text here.");
    await expect(extractPolicyText(md, "markdown")).resolves.toContain(
      "Access Control"
    );

    const txt = new TextEncoder().encode("Plain policy body with enough text.");
    await expect(extractPolicyText(txt, "text")).resolves.toContain(
      "Plain policy body"
    );
  });

  it("rejects empty uploads", async () => {
    await expect(extractPolicyText(new Uint8Array(), "text")).rejects.toMatchObject(
      { code: "EMPTY_FILE" }
    );
  });

  it("prepareUploadedPolicyContent rejects short extraction", async () => {
    const short = new TextEncoder().encode("tiny");
    await expect(
      prepareUploadedPolicyContent(short, "text")
    ).rejects.toBeInstanceOf(PolicyUploadError);
  });

  it("prepareUploadedPolicyContent normalizes extracted text", async () => {
    const source = new TextEncoder().encode(
      "#Access Control\n\nPurpose paragraph with enough characters."
    );
    const content = await prepareUploadedPolicyContent(source, "markdown");
    expect(content).toContain("# Access Control");
    expect(content.length).toBeGreaterThanOrEqual(10);
  });
});
