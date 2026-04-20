"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useClerk, useOrganizationList } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/**
 * Post-auth gate. Runs after sign-in / sign-up / SSO finalize and decides
 * where the user should land:
 *
 *  - Not signed in           → purge client session, then /sign-in
 *  - Active org on session   → /dashboard (which itself sends the user back
 *                              to /onboarding if the org is mid-setup)
 *  - No active org, has a
 *    membership              → activate the first one, then /dashboard
 *  - No memberships          → /onboarding (fresh setup)
 *
 * Loop guard: `/sign-in` server-side redirects signed-in users to
 * `/post-auth`. If client-side Clerk state disagrees with the server (stale
 * cookie, revoked JWT, cross-tab sign-out, dev DB reset, etc.), a naive
 * `router.replace("/sign-in")` here would bounce back indefinitely because
 * the server would keep seeing a valid userId cookie. We avoid this by
 * calling `signOut()` first — it purges the session cookie on both sides,
 * so the next `/sign-in` render genuinely has no userId and stops redirecting.
 * A sessionStorage counter surfaces a recovery UI if a bounce still happens
 * for any reason.
 */
const BOUNCE_KEY = "cgi.postAuth.bounces";
const MAX_BOUNCES = 2;

function readBounces(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.sessionStorage.getItem(BOUNCE_KEY);
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

function bumpBounces(): number {
  if (typeof window === "undefined") return 0;
  const next = readBounces() + 1;
  window.sessionStorage.setItem(BOUNCE_KEY, String(next));
  return next;
}

function clearBounces(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(BOUNCE_KEY);
}

export default function PostAuthPage() {
  const router = useRouter();
  const clerk = useClerk();
  const { isLoaded: authLoaded, isSignedIn, orgId } = useAuth();
  const { isLoaded: listLoaded, userMemberships, setActive } =
    useOrganizationList({ userMemberships: true });

  const routed = useRef(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (routed.current) return;
    if (!authLoaded) return;

    if (!isSignedIn) {
      // If we've already bounced through here without a valid session, the
      // loop-guard short-circuits to a recovery UI instead of redirecting.
      if (bumpBounces() >= MAX_BOUNCES) {
        routed.current = true;
        setStuck(true);
        return;
      }

      routed.current = true;
      // Purge whatever stale session state the client has so `/sign-in`'s
      // server-side `auth()` sees no userId and renders the form instead of
      // redirecting back. Hard navigation (redirectUrl) guarantees the server
      // re-renders with fresh cookies.
      void clerk.signOut({ redirectUrl: "/sign-in" });
      return;
    }

    // Successful gate-through — reset the bounce counter so a later session
    // expiry starts fresh rather than immediately tripping the recovery UI.
    clearBounces();

    if (orgId) {
      routed.current = true;
      router.replace("/dashboard");
      return;
    }

    if (!listLoaded || !userMemberships || userMemberships.isLoading) return;

    const memberships = userMemberships.data ?? [];
    const first = memberships[0];

    if (!first) {
      routed.current = true;
      router.replace("/onboarding");
      return;
    }

    routed.current = true;
    void (async () => {
      try {
        if (setActive) {
          await setActive({ organization: first.organization.id });
        }
      } finally {
        router.replace("/dashboard");
      }
    })();
  }, [
    authLoaded,
    isSignedIn,
    orgId,
    listLoaded,
    userMemberships,
    setActive,
    router,
    clerk,
  ]);

  if (stuck) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">Your session expired</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            We couldn&apos;t resume where you left off. Sign in again to
            continue — this usually happens when a session is revoked or
            cookies get out of sync across tabs.
          </p>
        </div>
        <Button
          onClick={() => {
            clearBounces();
            void clerk.signOut({ redirectUrl: "/sign-in" });
          }}
          className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
        >
          Sign in again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span
        className="inline-block size-8 animate-spin rounded-full border-[3px] border-brand/20 border-t-brand"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">Setting up your workspace…</p>
    </div>
  );
}
