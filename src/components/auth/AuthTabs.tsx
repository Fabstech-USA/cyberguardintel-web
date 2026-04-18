import Link from "next/link";

import { cn } from "@/lib/utils";

type AuthTabsProps = {
  active: "sign-up" | "sign-in";
};

export function AuthTabs({ active }: AuthTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Authentication"
      className="mx-auto grid w-full max-w-[280px] grid-cols-2 rounded-lg border border-border bg-muted/60 p-1"
    >
      <TabLink href="/sign-up" label="Sign up" active={active === "sign-up"} />
      <TabLink href="/sign-in" label="Sign in" active={active === "sign-in"} />
    </div>
  );
}

function TabLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-md px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-background text-foreground shadow-xs ring-1 ring-border/70"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}
