"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileStack,
  Plug,
  Settings2,
  Shield,
} from "lucide-react";

import { useDashboardLayout } from "@/components/dashboard/dashboard-layout-context";
import { cn } from "@/lib/utils";

export const DASHBOARD_SIDEBAR_NAV_ID = "dashboard-collapsible-sidebar-nav";

type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

/** HIPAA dashboard lives at `/dashboard`; deep links under `/hipaa/*` stay under HIPAA. */
const items: NavItem[] = [
  {
    id: "hipaa",
    href: "/dashboard",
    label: "HIPAA",
    icon: Shield,
    isActive: (p) =>
      p === "/dashboard" || p === "/hipaa" || p.startsWith("/hipaa/"),
  },
  {
    id: "soc2",
    href: "/soc2",
    label: "SOC 2",
    icon: ClipboardCheck,
    isActive: (p) => p === "/soc2" || p.startsWith("/soc2/"),
  },
  {
    id: "evidence",
    href: "/evidence",
    label: "Evidence",
    icon: FileStack,
    isActive: (p) => p === "/evidence" || p.startsWith("/evidence/"),
  },
  {
    id: "integrations",
    href: "/integrations",
    label: "Integrations",
    icon: Plug,
    isActive: (p) => p === "/integrations" || p.startsWith("/integrations/"),
  },
  {
    id: "settings",
    href: "/settings",
    label: "Settings",
    icon: Settings2,
    isActive: (p) => p === "/settings" || p.startsWith("/settings/"),
  },
];

export function DashboardCollapsibleSidebar(): React.JSX.Element | null {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    toggleSidebarCollapsed,
    mobileNavOpen,
    setMobileNavOpen,
  } = useDashboardLayout();

  const isOnboarding = pathname.startsWith("/onboarding");

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen || isOnboarding) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen, isOnboarding, setMobileNavOpen]);

  if (isOnboarding) {
    return null;
  }

  const nav = (
    <nav
      id={DASHBOARD_SIDEBAR_NAV_ID}
      className="flex flex-1 flex-col gap-1 p-2 sm:p-3"
      aria-label="Main navigation"
    >
      {items.map(({ id, href, label, icon: Icon, isActive: navIsActive }) => {
        const active = navIsActive(pathname);
        return (
          <Link
            key={id}
            href={href}
            title={sidebarCollapsed ? label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              sidebarCollapsed && "sm:justify-center sm:px-2"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <span
              className={cn(
                "truncate",
                sidebarCollapsed && "sm:sr-only"
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  const collapseToggle = (
    <div className="mt-auto border-t border-border p-2">
      <button
        type="button"
        onClick={toggleSidebarCollapsed}
        className={cn(
          "hidden w-full items-center rounded-md py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex",
          sidebarCollapsed ? "justify-center" : "justify-end pr-1"
        )}
        aria-expanded={!sidebarCollapsed}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
        )}
      </button>
    </div>
  );

  return (
    <>
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 top-14 z-30 bg-background/80 backdrop-blur-sm sm:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-14 z-40 flex h-[calc(100dvh-3.5rem)] w-56 flex-col border-r border-border bg-background",
          "transition-[width,transform] duration-200 ease-out",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          "sm:sticky sm:top-0 sm:z-0 sm:h-screen sm:translate-x-0 sm:self-start",
          sidebarCollapsed ? "sm:w-[4.5rem]" : "sm:w-56"
        )}
      >
        <div
          className={cn(
            "border-b border-border px-3 py-3 sm:py-3",
            sidebarCollapsed && "sm:px-2 sm:py-2"
          )}
        >
          <p
            className={cn(
              "text-xs font-medium uppercase tracking-wide text-muted-foreground",
              sidebarCollapsed && "sm:sr-only"
            )}
          >
            Navigate
          </p>
        </div>
        {nav}
        {collapseToggle}
      </aside>
    </>
  );
}
