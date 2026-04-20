import Link from "next/link";
import { AuthTrustBanner } from "@/components/auth/AuthTrustBanner";

type Props = {
  /** Sign-up includes Terms / Privacy; sign-in omits them. */
  showLegalLinks?: boolean;
};

export function AuthFooter({ showLegalLinks = true }: Props) {
  return (
    <div className="space-y-2 pt-2 text-center">
      <AuthTrustBanner />
      {showLegalLinks ? (
        <p className="text-[12px] text-muted-foreground">
          By creating an account you agree to our{" "}
          <Link
            href="/legal/terms"
            className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/legal/privacy"
            className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
