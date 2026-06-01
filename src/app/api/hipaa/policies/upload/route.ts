import { NextResponse } from "next/server";
import { PolicyStatus, PolicyType } from "@/generated/prisma";
import { canManageHipaaPolicies } from "@/lib/hipaa-policy-access";
import { getPolicyDisplayTitle } from "@/lib/hipaa-policy-catalog";
import { upsertHipaaPolicyFromUpload } from "@/lib/hipaa-policy-persist";
import {
  PolicyUploadError,
  buildPolicySourceS3Key,
  defaultPolicyUploadMimeType,
  detectPolicyUploadKind,
  prepareUploadedPolicyContent,
} from "@/lib/policy-upload";
import { putObjectToS3 } from "@/lib/s3";
import { withTenant } from "@/lib/tenant";

export const maxDuration = 60;

export const POST = withTenant(async (req, ctx): Promise<Response> => {
  if (!canManageHipaaPolicies(ctx.orgRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
  }

  const file = formData.get("file");
  const policyTypeRaw = formData.get("policy_type");
  const titleRaw = formData.get("title");
  const fileNameFromField = formData.get("fileName");

  if (
    typeof policyTypeRaw !== "string" ||
    !(Object.values(PolicyType) as string[]).includes(policyTypeRaw)
  ) {
    return NextResponse.json({ error: "Invalid policy type" }, { status: 400 });
  }

  const policyType = policyTypeRaw as PolicyType;

  if (
    !file ||
    typeof file !== "object" ||
    !("arrayBuffer" in file) ||
    typeof file.arrayBuffer !== "function"
  ) {
    return NextResponse.json({ error: "Missing file upload" }, { status: 400 });
  }

  const uploadFile = file as File;
  const fileName =
    typeof fileNameFromField === "string" && fileNameFromField.trim().length > 0
      ? fileNameFromField
      : uploadFile.name?.trim() || "policy-upload";

  const mimeType = uploadFile.type || "application/octet-stream";
  const kind = detectPolicyUploadKind(fileName, mimeType);
  if (!kind) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload .md, .txt, .docx, or .pdf." },
      { status: 400 }
    );
  }

  const bytes = new Uint8Array(await uploadFile.arrayBuffer());

  let content: string;
  try {
    content = await prepareUploadedPolicyContent(bytes, kind);
  } catch (err) {
    if (err instanceof PolicyUploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const title =
    typeof titleRaw === "string" && titleRaw.trim().length > 0
      ? titleRaw.trim()
      : getPolicyDisplayTitle(policyType);

  const sourceMimeType = mimeType || defaultPolicyUploadMimeType(kind);
  const sourceS3Key = buildPolicySourceS3Key(ctx.organizationId, fileName);
  await putObjectToS3(sourceS3Key, bytes, sourceMimeType);

  const policy = await upsertHipaaPolicyFromUpload({
    organizationId: ctx.organizationId,
    clerkUserId: ctx.clerkUserId,
    policyType,
    title,
    content,
    sourceS3Key,
    sourceMimeType,
    sourceFileName: fileName,
  });

  return NextResponse.json(
    {
      policy: {
        id: policy.id,
        type: policy.type,
        title: policy.title,
        status: policy.status as PolicyStatus,
        version: policy.version,
      },
    },
    { status: 201 }
  );
});
