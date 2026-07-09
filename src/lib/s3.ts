import { createHash } from "crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";

export type SignedUrl = string;

const SIGNED_URL_EXPIRES_IN_SECONDS = 900;

let s3Client: S3Client | null = null;
let stsClient: STSClient | null = null;
let resolvedKmsKeyIdPromise: Promise<string> | null = null;

function getS3Bucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET is not set");
  }
  return bucket;
}

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error("AWS_REGION is not set");
  }

  s3Client = new S3Client({ region });
  return s3Client;
}

function getStsClient(): STSClient {
  if (stsClient) return stsClient;

  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error("AWS_REGION is not set");
  }

  stsClient = new STSClient({ region });
  return stsClient;
}

async function getSseKmsKeyId(): Promise<string> {
  const configured =
    process.env.KMS_KEY_ID?.trim() || process.env.AWS_KMS_KEY_ID?.trim();
  if (configured) return configured;

  if (!resolvedKmsKeyIdPromise) {
    resolvedKmsKeyIdPromise = (async () => {
      const region = process.env.AWS_REGION;
      if (!region) {
        throw new Error("AWS_REGION is not set");
      }

      const identity = await getStsClient().send(new GetCallerIdentityCommand({}));
      const accountId = identity.Account?.trim();
      if (!accountId) {
        throw new Error("Could not resolve AWS account id for KMS alias");
      }

      return `arn:aws:kms:${region}:${accountId}:alias/cyberguardintel-evidence-prod`;
    })();
  }

  return resolvedKmsKeyIdPromise;
}

export async function getSignedUploadUrl(
  key: string,
  contentType = "application/pdf"
): Promise<SignedUrl> {
  const kmsKeyId = await getSseKmsKeyId();
  const command = new PutObjectCommand({
    Bucket: getS3Bucket(),
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: "aws:kms",
    SSEKMSKeyId: kmsKeyId,
  });
  return getSignedUrl(getS3Client(), command, {
    expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
  });
}

export async function putObjectToS3(
  key: string,
  body: Uint8Array,
  contentType = "application/pdf",
  metadata?: Record<string, string>
): Promise<void> {
  const kmsKeyId = await getSseKmsKeyId();
  const command = new PutObjectCommand({
    Bucket: getS3Bucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
    ServerSideEncryption: "aws:kms",
    SSEKMSKeyId: kmsKeyId,
    ...(metadata ? { Metadata: metadata } : {}),
  });
  await getS3Client().send(command);
}

export async function uploadEvidenceFile(params: {
  orgId: string;
  controlId: string;
  fileName: string;
  content: Buffer;
  mimeType: string;
}): Promise<{ s3Key: string; fileHash: string }> {
  const fileHash = createHash("sha256").update(params.content).digest("hex");
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const s3Key = `orgs/${params.orgId}/controls/${params.controlId}/${fileHash}-${safeName}`;

  await putObjectToS3(s3Key, params.content, params.mimeType, {
    "org-id": params.orgId,
    "control-id": params.controlId,
    sha256: fileHash,
  });

  return { s3Key, fileHash };
}

export async function getSignedDownloadUrl(key: string): Promise<SignedUrl> {
  const command = new GetObjectCommand({
    Bucket: getS3Bucket(),
    Key: key,
  });
  return getSignedUrl(getS3Client(), command, {
    expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
  });
}

export async function getObjectFromS3(key: string): Promise<{
  body: Buffer;
  contentType: string | undefined;
  metadata: Record<string, string> | undefined;
}> {
  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: getS3Bucket(),
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error("S3 object body is empty");
  }

  const bytes = await response.Body.transformToByteArray();
  return {
    body: Buffer.from(bytes),
    contentType: response.ContentType,
    metadata: response.Metadata,
  };
}

