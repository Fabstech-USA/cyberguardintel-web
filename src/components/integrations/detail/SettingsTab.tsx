"use client";

import Link from "next/link";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { IntegrationDetailDto } from "@/lib/integration-detail-queries";
import { cn } from "@/lib/utils";

type SettingsTabProps = {
  integration: IntegrationDetailDto;
  paused: boolean;
  pausing: boolean;
  onTogglePause: () => void;
  onDisconnect: () => void;
};

function Toggle({
  on,
  disabled,
  onClick,
  title,
}: {
  on: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative h-[18px] w-8 shrink-0 rounded-full border-0 p-0 transition-colors",
        on ? "bg-emerald-600" : "bg-muted",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-3.5 rounded-full bg-white transition-[left]",
          on ? "left-4" : "left-0.5"
        )}
      />
    </button>
  );
}

export function SettingsTab({
  integration,
  paused,
  pausing,
  onTogglePause,
  onDisconnect,
}: SettingsTabProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Credentials & authentication</h3>
            <p className="text-[11.5px] text-muted-foreground">
              Connected via {integration.authMethod ?? "credentials"}. Credentials
              encrypted with AES-256-GCM.
            </p>
          </div>
          {integration.reconnectHref ? (
            <Button variant="outline" size="sm" className="h-8 text-[11.5px]" asChild>
              <Link href={integration.reconnectHref}>Rotate credentials</Link>
            </Button>
          ) : null}
        </div>

        <div className="divide-y">
          <div className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-3 py-2.5 text-[12.5px] sm:grid-cols-[200px_minmax(0,1fr)]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Shield className="size-3.5" />
              Auth method
            </div>
            <div>
              <div className="font-medium">
                {integration.authMethod ?? "Unknown"}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Last sync status: {integration.lastSyncStatus ?? "never synced"}
              </div>
            </div>
          </div>

          {integration.safeConfig.map((entry) => (
            <div
              key={entry.key}
              className="grid grid-cols-[160px_minmax(0,1fr)] items-start gap-3 py-2.5 text-[12.5px] sm:grid-cols-[200px_minmax(0,1fr)]"
            >
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Shield className="size-3.5" />
                {entry.label}
              </div>
              <div className="min-w-0 font-mono text-[11.5px] break-all">
                {entry.value}
              </div>
            </div>
          ))}

          {integration.safeConfig.length === 0 ? (
            <div className="py-2.5 text-[12.5px] text-muted-foreground">
              No non-sensitive configuration fields are stored for this
              connection. Secrets remain encrypted and are never displayed.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-1">
          <h3 className="text-sm font-semibold">Sync preferences</h3>
          <p className="text-[11.5px] text-muted-foreground">
            Control when and how we collect from {integration.displayName}.
          </p>
        </div>

        <div className="divide-y">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 py-3">
            <div>
              <p className="text-[12.5px] font-medium">Automatic sync</p>
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                Org-wide incremental sync runs daily at 2:00 AM UTC.
              </p>
            </div>
            <Toggle on disabled title="Managed org-wide" />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 py-3">
            <div>
              <p className="text-[12.5px] font-medium">Notify on sync failure</p>
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                Email notifications for repeated failures are coming soon.
              </p>
            </div>
            <Toggle on={false} disabled title="Coming soon" />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 py-3">
            <div>
              <p className="text-[12.5px] font-medium">Pause syncs</p>
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                Temporarily stop collection without disconnecting. Useful during
                maintenance windows.
              </p>
            </div>
            <Toggle
              on={paused}
              disabled={pausing || integration.status === "ERROR"}
              onClick={onTogglePause}
              title={paused ? "Resume syncs" : "Pause syncs"}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-red-300/80 bg-card p-4 dark:border-red-900/60">
        <p className="text-[13px] font-medium text-red-900 dark:text-red-300">
          Disconnect {integration.displayName}
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
          Stops all evidence collection and deletes stored credentials. Existing
          evidence is preserved but will not be kept up to date. Your HIPAA
          readiness score will drop until another source covers these controls.
        </p>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="mt-3"
          onClick={onDisconnect}
        >
          Disconnect
        </Button>
      </section>
    </div>
  );
}
