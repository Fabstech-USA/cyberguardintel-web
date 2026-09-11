"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

import { AuthFooter } from "@/components/auth/AuthFooter";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { clerkEmbeddedAppearance } from "@/lib/clerk-embedded-appearance";

const AFTER_AUTH = "/post-auth";

function isAuthStartPath(pathname: string, path: "/sign-in" | "/sign-up"): boolean {
  return pathname === path || pathname === `${path}/`;
}

function InviteHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ClerkSignInFlow({ invite }: { invite: boolean }): React.JSX.Element {
  const pathname = usePathname();
  const showTabs = !invite && isAuthStartPath(pathname, "/sign-in");

  return (
    <div className="space-y-8">
      {showTabs ? <AuthTabs active="sign-in" /> : null}
      {invite ? (
        <InviteHeading
          title="Accept invitation"
          description="Sign in with the account that received this invite. A short security check (for example, verify you are human) may appear. That comes from Clerk bot protection for your organization."
        />
      ) : null}
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl={AFTER_AUTH}
        fallbackRedirectUrl={AFTER_AUTH}
        appearance={clerkEmbeddedAppearance({
          flush: true,
          hideSwitchLinks: showTabs,
          hideHeader: invite,
        })}
      />
      <AuthFooter showLegalLinks={false} />
    </div>
  );
}

export function ClerkSignUpFlow({ invite }: { invite: boolean }): React.JSX.Element {
  const pathname = usePathname();
  const showTabs = !invite && isAuthStartPath(pathname, "/sign-up");

  return (
    <div className="space-y-8">
      {showTabs ? <AuthTabs active="sign-up" /> : null}
      {invite ? (
        <InviteHeading
          title="Join your organization"
          description="Sign up using the email from your invitation. A short verification step may appear so automated sign-ups cannot abuse your organization."
        />
      ) : null}
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl={AFTER_AUTH}
        fallbackRedirectUrl={AFTER_AUTH}
        appearance={clerkEmbeddedAppearance({
          flush: true,
          hideSwitchLinks: showTabs,
          hideHeader: invite,
        })}
      />
      <AuthFooter />
    </div>
  );
}

export function AuthTicketRedirect({
  label,
}: {
  label: string;
}): React.JSX.Element {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-12 text-center">
      <span
        className="inline-block size-7 animate-spin rounded-full border-[3px] border-brand/20 border-t-brand"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
