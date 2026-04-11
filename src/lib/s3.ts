export type SignedUrl = string;

export async function getSignedUploadUrl(_key: string): Promise<SignedUrl> {
  throw new Error("Not implemented");
}

export async function getSignedDownloadUrl(_key: string): Promise<SignedUrl> {
  throw new Error("Not implemented");
}

