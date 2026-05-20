"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Policy } from "@/generated/prisma";
import { PolicyStatus } from "@/generated/prisma";
import { PolicyMarkdownView } from "@/components/hipaa/PolicyMarkdownView";
import { PolicyTiptapSurface } from "@/components/hipaa/PolicyTiptapSurface";
import { normalizePolicyMarkdown } from "@/lib/normalize-policy-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPolicyVersion } from "@/lib/hipaa-policy-version";

type Props = {
  policy: Policy;
  canEdit: boolean;
  /** When set, shows read-only historical content instead of the live policy body. */
  previewMarkdown?: string | null;
  previewVersionLabel?: string | null;
  onClearPreview?: () => void;
};

export function PolicyEditor({
  policy: initialPolicy,
  canEdit,
  previewMarkdown,
  previewVersionLabel,
  onClearPreview,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [policy, setPolicy] = useState(initialPolicy);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialPolicy.title);
  const [content, setContent] = useState(initialPolicy.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewingHistory = previewMarkdown != null;
  const displayMarkdown = viewingHistory ? previewMarkdown : policy.content;

  const editable =
    canEdit &&
    !viewingHistory &&
    (policy.status === PolicyStatus.DRAFT ||
      policy.status === PolicyStatus.UNDER_REVIEW);

  async function save(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/hipaa/policies/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: normalizePolicyMarkdown(content),
        }),
      });
      const raw = await res.text();
      if (!res.ok) {
        let message = `Save failed (${res.status})`;
        try {
          const parsed = raw ? (JSON.parse(raw) as { error?: string }) : null;
          if (parsed?.error) message = parsed.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      const updated = JSON.parse(raw) as Policy;
      setPolicy(updated);
      setTitle(updated.title);
      setContent(updated.content);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function cancel(): void {
    setTitle(policy.title);
    setContent(policy.content);
    setEditing(false);
    setError(null);
  }

  return (
    <article className="border-border bg-background flex flex-col gap-4 rounded-xl border p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">Policy document</h2>
          {viewingHistory && previewVersionLabel ? (
            <p className="text-muted-foreground text-xs">
              Viewing approved {previewVersionLabel}.{" "}
              {onClearPreview ? (
                <button
                  type="button"
                  className="text-foreground font-medium underline-offset-2 hover:underline"
                  onClick={onClearPreview}
                >
                  Back to current
                </button>
              ) : null}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              {formatPolicyVersion(policy.version)} · Saving edits keeps the same
              version. Approving saves a snapshot and advances the version
              number.
            </p>
          )}
        </div>
        {editable && !editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            Edit policy
          </Button>
        ) : null}
      </div>

      {!editable && canEdit && !viewingHistory ? (
        <p className="text-muted-foreground rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs">
          This policy is {policy.status.replace(/_/g, " ").toLowerCase()}.
          Change status to draft or under review to edit the text.
        </p>
      ) : null}

      {editing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="policy-title">Title</Label>
            <Input
              id="policy-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <PolicyTiptapSurface
              markdown={content}
              editable
              onMarkdownChange={setContent}
            />
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={cancel}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <PolicyMarkdownView
          markdown={displayMarkdown}
          className="border-input rounded-lg border px-1 py-2"
        />
      )}
    </article>
  );
}
