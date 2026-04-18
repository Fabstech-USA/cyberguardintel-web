import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function AuthFooter() {
  return (
    <div className="space-y-2 pt-2 text-center">
      <p className="inline-flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        <span>MFA enforced on all plans · SOC 2 and HIPAA aligned</span>
      </p>
      <p className="text-[12px] text-muted-foreground">
        By creating an account you agree to our{" "}
        <Link href="/legal/terms" className="font-medium text-foreground underline underline-offset-2 hover:no-underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="font-medium text-foreground underline underline-offset-2 hover:no-underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
