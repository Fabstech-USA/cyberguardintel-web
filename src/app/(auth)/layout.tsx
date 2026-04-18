import Link from "next/link";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
          >
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-md bg-brand text-sm font-semibold text-brand-foreground shadow-xs"
            >
              C
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              CyberGuardIntel AI
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 py-12 sm:py-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
