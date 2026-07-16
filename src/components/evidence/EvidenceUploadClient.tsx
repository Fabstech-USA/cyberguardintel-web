"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Upload } from "lucide-react";

import {
  ControlOwnerSelect,
  type ControlOwnerMember,
} from "@/components/hipaa/ControlOwnerSelect";
import { HelpTip } from "@/components/shared/HelpTip";
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
import { canManageHipaaControls } from "@/lib/hipaa-policy-access";

type OrgControlOption = {
  id: string;
  controlRef: string;
  controlTitle: string;
  ownerId: string | null;
};

export function EvidenceUploadClient() {
  const router = useRouter();
  const [orgControls, setOrgControls] = useState<OrgControlOption[]>([]);
  const [members, setMembers] = useState<ControlOwnerMember[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [orgControlId, setOrgControlId] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [controlsRes, membersRes] = await Promise.all([
          fetch("/api/evidence/controls"),
          fetch("/api/settings/members"),
        ]);
        if (controlsRes.ok) {
          const body = (await controlsRes.json()) as {
            orgControls?: OrgControlOption[];
          };
          const controls = body.orgControls ?? [];
          setOrgControls(controls);
          if (controls[0]) {
            setOrgControlId(controls[0].id);
            setOwnerId(controls[0].ownerId);
          }
        }
        if (membersRes.ok) {
          const body = (await membersRes.json()) as {
            members?: ControlOwnerMember[];
            currentUserRole?: string;
          };
          setMembers(
            (body.members ?? []).filter((m) => Boolean(m.clerkUserId))
          );
          setCanManage(canManageHipaaControls(body.currentUserRole ?? ""));
        }
      } catch {
        /* best-effort */
      }
    })();
  }, []);

  const selectedControl = useMemo(
    () => orgControls.find((c) => c.id === orgControlId) ?? null,
    [orgControls, orgControlId]
  );

  function handleControlChange(nextId: string): void {
    setOrgControlId(nextId);
    const next = orgControls.find((c) => c.id === nextId);
    setOwnerId(next?.ownerId ?? null);
    setOwnerError(null);
  }

  async function handleOwnerChange(nextOwnerId: string | null): Promise<void> {
    if (!orgControlId) return;
    const previous = ownerId;
    setOwnerId(nextOwnerId);
    setOwnerError(null);
    setOwnerSaving(true);
    try {
      const res = await fetch(`/api/hipaa/controls/${orgControlId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: nextOwnerId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Could not update owner.");
      }
      setOrgControls((current) =>
        current.map((c) =>
          c.id === orgControlId ? { ...c, ownerId: nextOwnerId } : c
        )
      );
    } catch (err) {
      setOwnerId(previous);
      setOwnerError(
        err instanceof Error ? err.message : "Could not update owner."
      );
    } finally {
      setOwnerSaving(false);
    }
  }

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
              <Label
                htmlFor="orgControlId"
                className="inline-flex items-center gap-1.5"
              >
                Control
                <HelpTip content="Pick the HIPAA safeguard this file proves. The number (e.g. 164.312) is the regulation citation auditors look for." />
              </Label>
              <Select value={orgControlId} onValueChange={handleControlChange}>
                <SelectTrigger id="orgControlId">
                  <SelectValue placeholder="Select control" />
                </SelectTrigger>
                <SelectContent>
                  {orgControls.map((control) => (
                    <SelectItem key={control.id} value={control.id}>
                      {control.controlRef}: {control.controlTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedControl ? (
              <div className="space-y-2">
                <Label
                  htmlFor="controlOwner"
                  className="inline-flex items-center gap-1.5"
                >
                  Control owner
                  <HelpTip content="Assign who is responsible for this control. Ownership contributes 10% of the control readiness score." />
                </Label>
                <div className="flex items-center gap-2">
                  <ControlOwnerSelect
                    id="controlOwner"
                    value={ownerId}
                    members={members}
                    canManage={canManage}
                    disabled={ownerSaving || !orgControlId}
                    onChange={(next) => {
                      void handleOwnerChange(next);
                    }}
                  />
                  {ownerSaving ? (
                    <Loader2
                      className="size-3.5 shrink-0 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                  ) : null}
                </div>
                {ownerError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {ownerError}
                  </p>
                ) : null}
              </div>
            ) : null}

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
