"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  /** Active organization display name (single-org product — no switcher). */
  orgName?: string | null;
  /** Full chip text, e.g. "Growth · Trial"; omit to hide chip */
  planChipText?: string | null;
};

export function DashboardHeader({
  orgName,
  planChipText,
}: Props): React.JSX.Element {
  const initial = orgName?.trim().charAt(0).toUpperCase() ?? "";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-foreground transition-opacity hover:opacity-90"
          aria-label="CyberGuardIntel home"
        >
          C
        </Link>
        {orgName ? (
          <div
            className="flex min-w-0 max-w-[min(100%,280px)] items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium text-foreground"
            title={orgName}
          >
            {initial ? (
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand"
                aria-hidden="true"
              >
                {initial}
              </span>
            ) : null}
            <span className="truncate">{orgName}</span>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {planChipText ? (
          <Badge
            variant="outline"
            className={cn(
              "inline-flex max-w-[min(42vw,10rem)] truncate font-medium sm:max-w-[11rem]",
              "border-brand/35 bg-brand/10 text-brand dark:bg-brand/15"
            )}
          >
            {planChipText}
          </Badge>
        ) : null}
        <ThemeToggle />
        <UserButton />
      </div>
    </header>
  );
}
