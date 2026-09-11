"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { BrandMark } from "@/components/marketing/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DEMO_MAILTO,
  SIGN_IN_HREF,
  TRIAL_HREF,
} from "@/lib/marketing-ctas";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
] as const;

export function MarketingNav(): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <BrandMark />

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/contact"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact
          </Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button asChild variant="ghost" size="lg">
            <Link href={SIGN_IN_HREF}>Sign in</Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
          >
            <Link href={TRIAL_HREF}>Start free trial</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          "border-t border-border/70 bg-background px-6 py-4 md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav className="flex flex-col gap-3" aria-label="Mobile">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="py-1 text-sm text-foreground"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/contact"
            className="py-1 text-sm text-foreground"
            onClick={() => setOpen(false)}
          >
            Contact
          </Link>
          <a
            href={DEMO_MAILTO}
            className="py-1 text-sm text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            Book a demo
          </a>
          <div className="mt-2 flex flex-col gap-2">
            <Button asChild variant="outline" size="lg">
              <Link href={SIGN_IN_HREF}>Sign in</Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
            >
              <Link href={TRIAL_HREF}>Start free trial</Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
