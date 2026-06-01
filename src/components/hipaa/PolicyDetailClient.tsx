"use client";

import { useCallback, useState } from "react";
import type { Policy, PolicyStatus } from "@/generated/prisma";
import { PolicyDetailActions } from "@/components/hipaa/PolicyDetailActions";
import { PolicyEditor } from "@/components/hipaa/PolicyEditor";
import { PolicyVersionSidebar } from "@/components/hipaa/PolicyVersionSidebar";
import { formatPolicyVersion } from "@/lib/hipaa-policy-version";
import { cn } from "@/lib/utils";

type Props = {
  policy: Policy;
  displayTitle: string;
  allowedTransitions: PolicyStatus[];
  canManagePolicies: boolean;
};

export function PolicyDetailClient({
  policy,
  displayTitle,
  allowedTransitions,
  canManagePolicies,
}: Props): React.JSX.Element {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const loadVersion = useCallback(
    async (version: number) => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const res = await fetch(
          `/api/hipaa/policies/${policy.id}/versions/${version}`
        );
        if (!res.ok) {
          throw new Error(`Failed to load version (${res.status})`);
        }
        const data = (await res.json()) as {
          version: { content: string };
        };
        setSelectedVersion(version);
        setPreviewMarkdown(data.version.content);
        setHistoryOpen(true);
      } catch (err) {
        setPreviewError(
          err instanceof Error ? err.message : "Could not load version"
        );
      } finally {
        setPreviewLoading(false);
      }
    },
    [policy.id]
  );

  function clearPreview(): void {
    setSelectedVersion(null);
    setPreviewMarkdown(null);
    setPreviewError(null);
  }

  return (
    <>
      <PolicyDetailActions
        key={`${policy.id}-actions-v${policy.version}`}
        policy={policy}
        displayTitle={displayTitle}
        allowedTransitions={allowedTransitions}
        canManagePolicies={canManagePolicies}
      />

      <div
        className={cn(
          "grid gap-6",
          historyOpen && "lg:grid-cols-[minmax(0,1fr)_220px]"
        )}
      >
        <div className="min-w-0 space-y-2">
          {previewLoading ? (
            <p className="text-muted-foreground text-xs">Loading version…</p>
          ) : null}
          {previewError ? (
            <p role="alert" className="text-destructive text-xs">
              {previewError}
            </p>
          ) : null}
          <PolicyEditor
            key={`${policy.id}-editor-v${policy.version}-${selectedVersion ?? "current"}`}
            policy={policy}
            canEdit={canManagePolicies}
            previewMarkdown={previewMarkdown}
            previewVersionLabel={
              selectedVersion != null
                ? formatPolicyVersion(selectedVersion)
                : null
            }
            onClearPreview={selectedVersion != null ? clearPreview : undefined}
            historyOpen={historyOpen}
            onToggleHistory={() => setHistoryOpen((open) => !open)}
          />
        </div>

        {historyOpen ? (
          <PolicyVersionSidebar
            policyId={policy.id}
            selectedVersion={selectedVersion}
            onSelectVersion={(v) => void loadVersion(v)}
            onClose={() => setHistoryOpen(false)}
            className="lg:sticky lg:top-6 lg:self-start"
          />
        ) : null}
      </div>
    </>
  );
}
