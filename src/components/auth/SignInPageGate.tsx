"use client";

import { useEffect } from "react";
import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { SignInForm } from "@/components/auth/SignInForm";
import { clerkEmbeddedAppearance } from "@/lib/clerk-embedded-appearance";

const AFTER_AUTH = "/post-auth";

/**
 * Org invitations append `__clerk_ticket` + `__clerk_status`. Clerk’s prebuilt
 * `<SignIn />` consumes the ticket and ties the session to the invited identifier,
 * avoiding custom `signIn.ticket()` / `needs_identifier` handling.
 */
export function SignInPageGate(): React.JSX.Element {
  const searchParams = useSearchParams();
  const ticket = searchParams.get("__clerk_ticket");
  const status = searchParams.get("__clerk_status");

  useEffect(() => {
    if (ticket === null || ticket === "") return;
    if (status !== "sign_up") return;
    if (typeof window !== "undefined") {
      window.location.replace(`/sign-up?${searchParams.toString()}`);
    }
  }, [ticket, status, searchParams]);

  if (ticket !== null && ticket !== "" && status === "sign_up") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-12 text-center">
        <span
          className="inline-block size-7 animate-spin rounded-full border-[3px] border-brand/20 border-t-brand"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">Taking you to sign up…</p>
      </div>
    );
  }

  const showClerkSignIn =
    ticket !== null && ticket !== "" && status !== "sign_up";

  if (showClerkSignIn) {
    return (
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-lg font-semibold text-foreground">Accept invitation</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with the account that received this invite. A short security check (e.g.
            “verify you are human”) may appear — that comes from Clerk’s bot protection for your
            organization.
          </p>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl={AFTER_AUTH}
          fallbackRedirectUrl={AFTER_AUTH}
          appearance={clerkEmbeddedAppearance}
        />
        <AuthFooter showLegalLinks={false} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AuthTabs active="sign-in" />
      <SignInForm />
      <AuthFooter showLegalLinks={false} />
    </div>
  );
}
