import Link from "next/link";

import { BrandMark } from "@/components/marketing/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-6">
          <BrandMark />
          <div className="flex items-center gap-5">
            <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
              <Link href="/legal/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="/legal/privacy" className="hover:text-foreground">
                Privacy
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} Fabstech LLC. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/legal/terms" className="hover:text-foreground sm:hidden">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:text-foreground sm:hidden">
              Privacy
            </Link>
            <Link href="/" className="hover:text-foreground">
              Back to CyberGuardIntel AI
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
