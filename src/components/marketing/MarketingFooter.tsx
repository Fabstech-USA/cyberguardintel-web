import Link from "next/link";

import { BrandMark } from "@/components/marketing/BrandMark";
import {
  DEMO_MAILTO,
  SIGN_IN_HREF,
  TRIAL_HREF,
} from "@/lib/marketing-ctas";

export function MarketingFooter(): React.JSX.Element {
  return (
    <footer className="border-t border-border/70 bg-background py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BrandMark />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            HIPAA compliance readiness for healthcare organizations and
            health-tech vendors.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Fabstech LLC. All rights reserved.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-6 text-sm">
          <div className="flex flex-col gap-2">
            <p className="font-medium text-foreground">Product</p>
            <a
              href="#product"
              className="text-muted-foreground hover:text-foreground"
            >
              Capabilities
            </a>
            <a
              href="#how-it-works"
              className="text-muted-foreground hover:text-foreground"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="text-muted-foreground hover:text-foreground"
            >
              Pricing
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium text-foreground">Account</p>
            <Link
              href={SIGN_IN_HREF}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href={TRIAL_HREF}
              className="text-muted-foreground hover:text-foreground"
            >
              Start free trial
            </Link>
            <a
              href={DEMO_MAILTO}
              className="text-muted-foreground hover:text-foreground"
            >
              Book a demo
            </a>
            <Link
              href="/contact"
              className="text-muted-foreground hover:text-foreground"
            >
              Contact us
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium text-foreground">Legal</p>
            <Link
              href="/legal/terms"
              className="text-muted-foreground hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/legal/privacy"
              className="text-muted-foreground hover:text-foreground"
            >
              Privacy
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium text-foreground">Legal</p>
            <Link
              href="/legal/terms"
              className="text-muted-foreground hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/legal/privacy"
              className="text-muted-foreground hover:text-foreground"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
