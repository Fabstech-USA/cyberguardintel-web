"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrgControlOption = {
  id: string;
  controlRef: string;
  controlTitle: string;
};

export function EvidenceUploadClient() {
  const router = useRouter();
  const [orgControls, setOrgControls] = useState<OrgControlOption[]>([]);
  const [orgControlId, setOrgControlId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/evidence/controls");
        if (!res.ok) return;
        const body = (await res.json()) as { orgControls?: OrgControlOption[] };
        const controls = body.orgControls ?? [];
        setOrgControls(controls);
        if (controls[0]) setOrgControlId(controls[0].id);
      } catch {
        /* best-effort */
      }
    })();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !orgControlId || !title.trim()) {
      setError("Control, title, and file are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("orgControlId", orgControlId);
      formData.set("title", title.trim());
      if (description.trim()) formData.set("description", description.trim());
      formData.set("file", file);

      const res = await fetch("/api/evidence/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(
          typeof body.error === "string" ? body.error : "Upload failed"
        );
      }

      router.push("/evidence");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Button type="button" variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/evidence">
          <ArrowLeft className="mr-2 size-4" />
          Back to evidence browser
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Upload evidence</h1>
        <p className="text-sm text-muted-foreground">
          Attach a file to a HIPAA control. Files are SHA-256 hashed on upload.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual evidence</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="orgControlId">Control</Label>
              <Select value={orgControlId} onValueChange={setOrgControlId}>
                <SelectTrigger id="orgControlId">
                  <SelectValue placeholder="Select control" />
                </SelectTrigger>
                <SelectContent>
                  {orgControls.map((control) => (
                    <SelectItem key={control.id} value={control.id}>
                      {control.controlRef} — {control.controlTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Vulnerability scan report"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Brief summary for auditors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.csv,.json,.txt"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Upload className="mr-2 size-4" />
              )}
              Upload evidence
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
