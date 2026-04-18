"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useOrganizationList } from "@clerk/nextjs";

/**
 * Post-auth gate. Runs after sign-in / sign-up / SSO finalize and decides
 * where the user should land:
 *
 *  - Not signed in           → /sign-in
 *  - Active org on session   → /dashboard (which itself sends the user back
 *                              to /onboarding if the org is mid-setup)
 *  - No active org, has a
 *    membership              → activate the first one, then /dashboard
 *  - No memberships          → /onboarding (fresh setup)
 */
export default function PostAuthPage() {
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn, orgId } = useAuth();
  const { isLoaded: listLoaded, userMemberships, setActive } =
    useOrganizationList({ userMemberships: true });

  const routed = useRef(false);

  useEffect(() => {
    if (routed.current) return;
    if (!authLoaded) return;

    if (!isSignedIn) {
      routed.current = true;
      router.replace("/sign-in");
      return;
    }

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
  ]);

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
