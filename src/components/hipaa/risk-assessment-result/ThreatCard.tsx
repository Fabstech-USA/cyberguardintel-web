"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ThreatItem } from "@/lib/ai-risk-assessment";
import { cn } from "@/lib/utils";
import {
  RISK_LEVEL_BADGE_CLASS,
  RISK_LEVEL_LABEL,
} from "./risk-display";
import { categoryFromControls } from "./threat-category";

type Props = {
  threat: ThreatItem;
  defaultOpen?: boolean;
};

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ThreatCard({
  threat,
  defaultOpen = false,
}: Props): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  const category = categoryFromControls(threat.controls_affected);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-border bg-card"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40"
        >
          <div className="min-w-0 space-y-0.5">
            <div className="text-sm font-semibold text-foreground">
              {threat.threat_name}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                Source:{" "}
                <span className="text-foreground">
                  {capitalizeFirst(threat.threat_source)}
                </span>
              </span>
              <RiskInline label="Likelihood" level={threat.likelihood} />
              <RiskInline label="Impact" level={threat.impact} />
              <RiskInline label="Overall" level={threat.overall_risk} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {category}
            </Badge>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
              aria-hidden="true"
            />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden border-t border-border data-closed:animate-out data-open:animate-in">
        <div className="space-y-3 px-4 py-4 text-sm">
          <p className="leading-relaxed text-muted-foreground">
            {threat.recommendation}
          </p>
          <Detail label="Current controls" value={threat.current_controls} />
          {threat.controls_affected.length > 0 && (
            <Detail
              label="Controls affected"
              value={threat.controls_affected.join(", ")}
            />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function RiskInline({
  label,
  level,
}: {
  label: string;
  level: ThreatItem["likelihood"];
}): React.JSX.Element {
  return (
    <span className="flex items-center gap-1">
      {label}:
      <span
        className={cn(
          "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
          RISK_LEVEL_BADGE_CLASS[level]
        )}
      >
        {RISK_LEVEL_LABEL[level].toLowerCase()}
      </span>
    </span>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div className="space-y-0.5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm leading-relaxed">{value}</div>
    </div>
  );
}
