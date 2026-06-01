"use client";

import { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { PolicyType } from "@/generated/prisma";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getHipaaPolicyCatalog,
  getPolicyDisplayTitle,
} from "@/lib/hipaa-policy-catalog";
import { POLICY_UPLOAD_ACCEPT } from "@/lib/policy-upload-shared";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPolicyType?: PolicyType | null;
  replaceApproved?: boolean;
  onUploaded?: () => void;
};

export function PolicyUploadDialog({
  open,
  onOpenChange,
  initialPolicyType = null,
  replaceApproved = false,
  onUploaded,
}: Props): React.JSX.Element {
  const router = useRouter();
  const catalog = getHipaaPolicyCatalog();

  const [policyType, setPolicyType] = useState<PolicyType>(
    initialPolicyType ?? catalog[0]?.type ?? PolicyType.SECURITY_MANAGEMENT_PROCESS
  );
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError(null);
      setFile(null);
      return;
    }
    if (initialPolicyType) {
      setPolicyType(initialPolicyType);
    }
    setTitle("");
  }, [open, initialPolicyType]);

  async function submit(): Promise<void> {
    if (!file) {
      setError("Choose a policy file to upload.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      formData.append("policy_type", policyType);
      if (title.trim()) {
        formData.append("title", title.trim());
      }

      const res = await fetch("/api/hipaa/policies/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        policy?: { id: string };
      };

      if (!res.ok || !data.policy?.id) {
        throw new Error(data.error ?? "Upload failed");
      }

      onOpenChange(false);
      onUploaded?.();
      router.push(`/hipaa/policies/${data.policy.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  const defaultTitle = getPolicyDisplayTitle(policyType);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Upload policy</AlertDialogTitle>
          <AlertDialogDescription>
            Upload your existing policy file (.md, .txt, .docx, or .pdf). It
            becomes the approved current version immediately. We also extract
            text so you can search and reference it in the app.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="upload-policy-type">Policy type</Label>
            <Select
              value={policyType}
              onValueChange={(value) => setPolicyType(value as PolicyType)}
              disabled={submitting || Boolean(initialPolicyType)}
            >
              <SelectTrigger id="upload-policy-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {catalog.map((entry) => (
                  <SelectItem key={entry.type} value={entry.type}>
                    {entry.policyId} · {entry.displayTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="upload-policy-title">Title (optional)</Label>
            <Input
              id="upload-policy-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={defaultTitle}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="upload-policy-file">Policy file</Label>
            <Input
              id="upload-policy-file"
              type="file"
              accept={POLICY_UPLOAD_ACCEPT}
              disabled={submitting}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-muted-foreground text-xs">
              Supported: .md, .txt, .docx, .pdf
            </p>
          </div>

          {replaceApproved ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              Uploading replaces the current approved policy, saves the prior
              version to history, and publishes the new file as the approved
              current version.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              The uploaded file is stored as your official policy and marked
              approved right away.
            </p>
          )}

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            disabled={submitting || !file}
            onClick={() => void submit()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-2 size-4" aria-hidden />
                Upload policy
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
