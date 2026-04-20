import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FrameworkTabActive = "hipaa" | "soc2";

type Props = {
  active: FrameworkTabActive;
};

export function DashboardFrameworkTabs({ active }: Props): React.JSX.Element {
  const hipaaCurrent = active === "hipaa";
  const soc2Current = active === "soc2";

  return (
    <div
      role="tablist"
      aria-label="Compliance framework"
      className="-mx-1 flex flex-wrap items-center gap-1 overflow-x-auto border-b border-border pb-0 px-1"
    >
      {hipaaCurrent ? (
        <span
          role="tab"
          aria-selected="true"
          aria-current="page"
          className="relative inline-flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-foreground"
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
            aria-hidden="true"
          />
          HIPAA
          <span
            className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
            aria-hidden="true"
          />
        </span>
      ) : (
        <Link
          role="tab"
          aria-selected="false"
          href="/dashboard"
          className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50"
            aria-hidden="true"
          />
          HIPAA
        </Link>
      )}

      {soc2Current ? (
        <span
          role="tab"
          aria-selected="true"
          aria-current="page"
          className="relative inline-flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-foreground"
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
            aria-hidden="true"
          />
          SOC 2
          <Badge
            variant="secondary"
            className="border border-border bg-muted/70 font-normal text-muted-foreground"
          >
            Coming soon
          </Badge>
          <span
            className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
            aria-hidden="true"
          />
        </span>
      ) : (
        <Link
          role="tab"
          aria-selected="false"
          href="/soc2"
          className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          SOC 2
          <Badge
            variant="secondary"
            className="border border-border bg-muted/70 font-normal text-muted-foreground"
          >
            Coming soon
          </Badge>
        </Link>
      )}

      <Link
        href="/settings"
        className={cn(
          "ml-auto px-3 py-2.5 text-sm font-medium text-muted-foreground",
          "transition-colors hover:text-foreground"
        )}
      >
        + Add framework
      </Link>
    </div>
  );
}
