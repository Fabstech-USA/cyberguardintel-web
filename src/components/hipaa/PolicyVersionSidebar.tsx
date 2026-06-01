"use client";

import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPolicyVersion } from "@/lib/hipaa-policy-version";
import { cn } from "@/lib/utils";

export type PolicyVersionListItem = {
  version: number;
  title: string;
  approvedAt: string;
  approvedById: string;
};

type Props = {
  policyId: string;
  selectedVersion: number | null;
  onSelectVersion: (version: number) => void;
  onClose?: () => void;
  className?: string;
};

export function PolicyVersionSidebar({
  policyId,
  selectedVersion,
  onSelectVersion,
  onClose,
  className,
}: Props): React.JSX.Element {
  const [versions, setVersions] = useState<PolicyVersionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hipaa/policies/${policyId}/versions`);
      if (!res.ok) {
        throw new Error(`Failed to load versions (${res.status})`);
      }
      const data = (await res.json()) as { versions: PolicyVersionListItem[] };
      setVersions(data.versions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load versions");
    } finally {
      setLoading(false);
    }
  }, [policyId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <aside
      className={cn(
        "border-border bg-card flex flex-col gap-3 rounded-xl border p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Version history</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Previously approved revisions
          </p>
        </div>
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Hide version history"
            title="Hide version history"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-xs">Loading…</p>
      ) : error ? (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : versions.length === 0 ? (
        <p className="text-muted-foreground text-xs">No approved versions yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {versions.map((v) => {
            const active = selectedVersion === v.version;
            return (
              <li key={v.version}>
                <button
                  type="button"
                  onClick={() => onSelectVersion(v.version)}
                  className={cn(
                    "hover:bg-muted/60 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    active && "bg-muted font-medium"
                  )}
                >
                  <span className="block">
                    {formatPolicyVersion(v.version)}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    Approved{" "}
                    {format(new Date(v.approvedAt), "MMM d, yyyy")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
