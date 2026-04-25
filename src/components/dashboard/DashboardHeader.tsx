"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrganization, UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";

import { DASHBOARD_SIDEBAR_NAV_ID } from "@/components/dashboard/DashboardCollapsibleSidebar";
import { useDashboardLayout } from "@/components/dashboard/dashboard-layout-context";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  /** Full chip text, e.g. "Growth · Trial"; omit to hide chip */
  planChipText?: string | null;
};

/** Current org name only — no multi-org switcher in product UI. */
function ReadOnlyOrganizationName(): React.JSX.Element {
  const { organization, isLoaded } = useOrganization();

  if (!isLoaded) {
    return (
      <div
        className="h-9 max-w-[min(100%,260px)] animate-pulse rounded-md border border-border bg-muted/40"
        aria-hidden
      />
    );
  }

  if (!organization) {
    return (
      <span className="text-sm text-muted-foreground">No organization</span>
    );
  }

  return (
    <div
      className="inline-flex min-w-0 max-w-[min(100%,260px)] items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-sm font-medium"
      title={organization.name}
    >
      {organization.imageUrl ? (
        <img
          src={organization.imageUrl}
          alt=""
          className="h-6 w-6 shrink-0 rounded-md object-cover"
        />
      ) : null}
      <span className="min-w-0 truncate">{organization.name}</span>
    </div>
  );
}

export function DashboardHeader({
  planChipText,
}: Props): React.JSX.Element {
  const pathname = usePathname();
  const isOnboarding = pathname.startsWith("/onboarding");
  const { toggleMobileNav, mobileNavOpen } = useDashboardLayout();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-foreground transition-opacity hover:opacity-90"
          aria-label="CyberGuardIntel home"
        >
          C
        </Link>
        {!isOnboarding ? (
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground sm:hidden"
            onClick={toggleMobileNav}
            aria-expanded={mobileNavOpen}
            aria-controls={DASHBOARD_SIDEBAR_NAV_ID}
            aria-label={
              mobileNavOpen ? "Close navigation menu" : "Open navigation menu"
            }
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <ReadOnlyOrganizationName />
        </div>
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
