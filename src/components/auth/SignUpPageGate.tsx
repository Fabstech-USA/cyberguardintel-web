"use client";

import { useEffect } from "react";
import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { clerkEmbeddedAppearance } from "@/lib/clerk-embedded-appearance";

const AFTER_AUTH = "/post-auth";

/**
 * New members invited to an org arrive with `__clerk_ticket` and usually
 * `__clerk_status=sign_up`. Clerk `<SignUp />` handles ticket + required fields.
 */
export function SignUpPageGate(): React.JSX.Element {
  const searchParams = useSearchParams();
  const ticket = searchParams.get("__clerk_ticket");
  const status = searchParams.get("__clerk_status");

  useEffect(() => {
    if (ticket === null || ticket === "") return;
    if (status !== "sign_in") return;
    if (typeof window !== "undefined") {
      window.location.replace(`/sign-in?${searchParams.toString()}`);
    }
  }, [ticket, status, searchParams]);

  if (ticket !== null && ticket !== "" && status === "sign_in") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-12 text-center">
        <span
          className="inline-block size-7 animate-spin rounded-full border-[3px] border-brand/20 border-t-brand"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">Taking you to sign in…</p>
      </div>
    );
  }

  const showClerkSignUp =
    ticket !== null && ticket !== "" && status !== "sign_in";

  if (showClerkSignUp) {
    return (
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-lg font-semibold text-foreground">Join your organization</h1>
          <p className="text-sm text-muted-foreground">
            Sign up using the email from your invitation. A short verification step may appear so
            automated sign-ups can’t abuse your organization.
          </p>
        </div>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl={AFTER_AUTH}
          fallbackRedirectUrl={AFTER_AUTH}
          appearance={clerkEmbeddedAppearance}
        />
        <AuthFooter />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AuthTabs active="sign-up" />
      <SignUpForm />
      <AuthFooter />
    </div>
  );
}
