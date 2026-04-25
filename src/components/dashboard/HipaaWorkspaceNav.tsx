"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type Item = {
  id: string;
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

const items: Item[] = [
  {
    id: "overview",
    href: "/dashboard",
    label: "Overview",
    isActive: (p) => p === "/dashboard",
  },
  {
    id: "risk",
    href: "/hipaa/risk-assessment",
    label: "Risk assessment",
    isActive: (p) =>
      p === "/hipaa/risk-assessment" || p.startsWith("/hipaa/risk-assessment/"),
  },
  {
    id: "policies",
    href: "/hipaa/policies",
    label: "Policies",
    isActive: (p) =>
      p === "/hipaa/policies" || p.startsWith("/hipaa/policies/"),
  },
  {
    id: "phi-flow",
    href: "/hipaa/phi-map",
    label: "PHI flow",
    isActive: (p) => p === "/hipaa/phi-map" || p.startsWith("/hipaa/phi-map/"),
  },
  {
    id: "baa",
    href: "/hipaa/baa-tracker",
    label: "BAA tracker",
    isActive: (p) =>
      p === "/hipaa/baa-tracker" || p.startsWith("/hipaa/baa-tracker/"),
  },
  {
    id: "training",
    href: "/hipaa/training",
    label: "Training",
    isActive: (p) =>
      p === "/hipaa/training" || p.startsWith("/hipaa/training/"),
  },
  {
    id: "audit-package",
    href: "/hipaa/audit-package",
    label: "Audit package",
    isActive: (p) =>
      p === "/hipaa/audit-package" ||
      p.startsWith("/hipaa/audit-package/"),
  },
];

/**
 * Second-level HIPAA workspace tabs (Overview, Risk assessment, Policies, …).
 */
export function HipaaWorkspaceNav(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav
      className="-mx-1 flex flex-wrap items-center gap-2 border-t border-border/70 px-1 pt-4"
      aria-label="HIPAA workspace"
    >
      {items.map(({ id, href, label, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={id}
            href={href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-2 border-brand bg-muted/90 text-foreground shadow-sm"
                : "border-2 border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
