import Link from "next/link";

import type { IntegrationStatus } from "@/generated/prisma";
import { IntegrationIcon } from "@/components/integrations/IntegrationIcon";
import { Button } from "@/components/ui/button";
import type { IntegrationPublicDto } from "@/lib/integration-api";
import type { IntegrationCatalogEntry } from "@/lib/integration-catalog";
import { getConnectHref } from "@/lib/integration-catalog";
import { toIconTargetFromType } from "@/lib/integration-icons";
import { cn } from "@/lib/utils";

function statusLabel(status: IntegrationStatus): string {
  if (status === "ACTIVE") return "Active";
  if (status === "ERROR") return "Error";
  if (status === "PAUSED") return "Paused";
  return "Disconnected";
}

function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[10.5px] font-medium",
        status === "ACTIVE" &&
          "bg-emerald-500/12 text-emerald-800 dark:text-emerald-400",
        status === "PAUSED" &&
          "bg-amber-500/12 text-amber-800 dark:text-amber-400",
        status === "ERROR" && "bg-red-500/10 text-red-700 dark:text-red-400"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "ACTIVE" && "bg-emerald-600 dark:bg-emerald-400",
          status === "PAUSED" && "bg-amber-600 dark:bg-amber-400",
          status === "ERROR" && "bg-red-600 dark:bg-red-400"
        )}
        aria-hidden
      />
      {statusLabel(status)}
    </span>
  );
}

function formatSyncAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type ConnectedIntegrationRowProps = {
  integration: IntegrationPublicDto;
  entry?: IntegrationCatalogEntry;
  onSync: (id: string) => void;
  syncing?: boolean;
};

export function ConnectedIntegrationRow({
  integration,
  entry,
  onSync,
  syncing = false,
}: ConnectedIntegrationRowProps) {
  const isError = integration.status === "ERROR";
  const reconnectHref = entry ? getConnectHref(entry) : null;
  const detailHref = `/integrations/${integration.id}`;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_88px_72px_72px]">
      <Link
        href={detailHref}
        className="contents"
        aria-label={`Open ${integration.displayName} details`}
      >
        <IntegrationIcon
          target={toIconTargetFromType(
            integration.type,
            integration.displayName,
            entry
          )}
          size="md"
          className="self-start sm:self-center"
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground hover:underline">
              {integration.displayName}
            </span>
            <IntegrationStatusBadge status={integration.status} />
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {entry?.description ?? integration.type}
          </p>
        </div>

        <div className="col-start-2 row-start-2 text-[11.5px] sm:col-start-3 sm:row-start-1 sm:text-xs">
          {syncing ? (
            <span className="text-muted-foreground">Syncing…</span>
          ) : isError ? (
            <span className="font-medium text-destructive">
              {integration.errorMessage ?? "Sync failed"}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {integration.lastSyncAt
                ? formatSyncAgo(integration.lastSyncAt)
                : "Never synced"}
            </span>
          )}
        </div>

        <div className="hidden text-xs sm:block">
          {isError ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="tabular-nums">
              <span className="font-semibold text-foreground">
                {integration.evidenceCount}
              </span>
              <span className="text-muted-foreground"> items</span>
            </span>
          )}
        </div>
      </Link>

      <div className="col-start-3 row-start-1 justify-self-end sm:col-start-5">
        {isError && reconnectHref ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-emerald-600 px-3 text-[11.5px] text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            asChild
          >
            <Link href={reconnectHref}>Reconnect</Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-[11.5px] text-muted-foreground"
            disabled={syncing}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSync(integration.id);
            }}
          >
            {syncing ? "Syncing…" : "Sync"}
          </Button>
        )}
      </div>
    </div>
  );
}
