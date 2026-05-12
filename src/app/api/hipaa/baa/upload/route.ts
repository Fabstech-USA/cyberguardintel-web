import { NextResponse } from "next/server";

import { putObjectToS3 } from "@/lib/s3";
import { canMutateBaa } from "@/lib/baa";
import { withTenant } from "@/lib/tenant";

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const POST = withTenant(async (req, ctx) => {
  if (!canMutateBaa(ctx.orgRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
  }

  const file = formData.get("file");
  const fileNameFromField = formData.get("fileName");
  const fileName =
    typeof fileNameFromField === "string" && fileNameFromField.trim().length > 0
      ? fileNameFromField
      : typeof file === "object" &&
          file !== null &&
          "name" in file &&
          typeof file.name === "string" &&
          file.name.trim().length > 0
        ? file.name
        : "";
  if (
    !file ||
    typeof file !== "object" ||
    !("arrayBuffer" in file) ||
    typeof file.arrayBuffer !== "function"
  ) {
    return NextResponse.json({ error: "Missing file upload" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
  }
  const safeName = sanitizeFileName(fileName || "signed-baa.pdf");
  const key = `hipaa/baa/${ctx.organizationId}/${crypto.randomUUID()}-${safeName || "signed-baa.pdf"}`;
  await putObjectToS3(key, bytes, "application/pdf");

  return NextResponse.json({ key });
});
