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
    id: "organization",
    href: "/settings/organization",
    label: "Organization",
    isActive: (p) =>
      p === "/settings/organization" || p.startsWith("/settings/organization/"),
  },
  {
    id: "members",
    href: "/settings/members",
    label: "Members",
    isActive: (p) => p === "/settings/members" || p.startsWith("/settings/members/"),
  },
  {
    id: "billing",
    href: "/settings/billing",
    label: "Billing",
    isActive: (p) => p === "/settings/billing" || p.startsWith("/settings/billing/"),
  },
  {
    id: "security",
    href: "/settings/security",
    label: "Security",
    isActive: (p) => p === "/settings/security" || p.startsWith("/settings/security/"),
  },
];

export function SettingsTabsNav(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav
      className="-mx-1 flex flex-wrap items-center gap-2 border-b border-border px-1 pb-4"
      aria-label="Settings"
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

