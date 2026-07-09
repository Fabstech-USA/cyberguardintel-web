import { ChevronRight } from "lucide-react";

import { IntegrationIcon } from "@/components/integrations/IntegrationIcon";
import type { IntegrationCatalogEntry } from "@/lib/integration-catalog";
import { toIconTarget } from "@/lib/integration-icons";
import { cn } from "@/lib/utils";

type IntegrationCardProps = {
  entry: IntegrationCatalogEntry;
  onClick: () => void;
  className?: string;
};

export function IntegrationCard({
  entry,
  onClick,
  className,
}: IntegrationCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg border bg-background p-2.5 text-left transition-colors hover:bg-muted/40",
        className
      )}
    >
      <IntegrationIcon target={toIconTarget(entry)} size="md" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{entry.name}</div>
        <div className="truncate text-[10.5px] text-muted-foreground">
          {entry.description}
        </div>
      </div>
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}
