import { formatDistanceToNow } from "date-fns";
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
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10.5px] font-medium",
        status === "ACTIVE" &&
          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        status === "PAUSED" &&
          "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        status === "ERROR" && "bg-destructive/10 text-destructive"
      )}
    >
      {statusLabel(status)}
    </span>
  );
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

  return (
    <div className="grid grid-cols-[24px_1fr_auto] items-center gap-3 border-b px-3.5 py-2.5 last:border-b-0 sm:grid-cols-[24px_minmax(0,1fr)_100px_72px_64px]">
      <IntegrationIcon
        target={toIconTargetFromType(
          integration.type,
          integration.displayName,
          entry
        )}
        size="sm"
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {integration.displayName}
          </span>
          <IntegrationStatusBadge status={integration.status} />
        </div>
        <p className="truncate text-[11px] text-muted-foreground">
          {entry?.description ?? integration.type}
        </p>
      </div>

      <div className="hidden text-xs sm:block">
        {isError ? (
          <span className="text-destructive">
            {integration.errorMessage ?? "Sync failed"}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {integration.lastSyncAt
              ? `${formatDistanceToNow(new Date(integration.lastSyncAt))} ago`
              : "Never synced"}
          </span>
        )}
      </div>

      <div className="hidden text-sm sm:block">
        {isError ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span>
            {integration.lastSyncCount}
            <span className="text-[10.5px] text-muted-foreground"> items</span>
          </span>
        )}
      </div>

      <div className="justify-self-end">
        {isError && reconnectHref ? (
          <Button
            variant="link"
            size="sm"
            className="h-7 px-0 text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            asChild
          >
            <Link href={reconnectHref}>Reconnect</Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            disabled={syncing || integration.status === "PAUSED"}
            onClick={() => onSync(integration.id)}
          >
            Sync
          </Button>
        )}
      </div>
    </div>
  );
}
