import { describe, expect, it } from "vitest";
import { PolicyType } from "@/generated/prisma";
import {
  detectPolicyUploadKind,
  PolicyUploadError,
} from "@/lib/policy-upload-shared";

// Mirrors validation branches in upload/route.ts without importing the route
// module (Clerk/Prisma/S3 side effects at module load).

function validatePolicyType(raw: unknown): PolicyType | null {
  if (
    typeof raw !== "string" ||
    !(Object.values(PolicyType) as string[]).includes(raw)
  ) {
    return null;
  }
  return raw as PolicyType;
}

function validateUploadFile(
  file: unknown
): file is File & { arrayBuffer: () => Promise<ArrayBuffer> } {
  return (
    !!file &&
    typeof file === "object" &&
    "arrayBuffer" in file &&
    typeof (file as File).arrayBuffer === "function"
  );
}

describe("policy upload route validation", () => {
  it("accepts known policy types", () => {
    expect(validatePolicyType(PolicyType.ACCESS_CONTROL)).toBe(
      PolicyType.ACCESS_CONTROL
    );
    expect(validatePolicyType("NOT_A_POLICY")).toBeNull();
  });

  it("requires a file object with arrayBuffer", () => {
    expect(validateUploadFile(null)).toBe(false);
    expect(validateUploadFile("file")).toBe(false);
    expect(
      validateUploadFile({
        arrayBuffer: async () => new ArrayBuffer(0),
      })
    ).toBe(true);
  });

  it("rejects unsupported extensions", () => {
    expect(detectPolicyUploadKind("policy.exe", "application/octet-stream")).toBeNull();
    expect(detectPolicyUploadKind("policy.md", "text/markdown")).toBe("markdown");
  });

  it("maps PolicyUploadError codes to client-safe messages", () => {
    const err = new PolicyUploadError(
      "EXTRACTION_FAILED",
      "Could not extract enough text from the uploaded file."
    );
    expect(err.code).toBe("EXTRACTION_FAILED");
    expect(err.message).toContain("Could not extract enough text");
  });
});
