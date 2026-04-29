"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useAuth,
  useClerk,
  useOrganizationList,
  useUser,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

/**
 * Post-auth gate. Runs after sign-in / sign-up / SSO finalize and decides
 * where the user should land:
 *
 *  - Not signed in           → purge client session, then /sign-in
 *  - Active org on session   → /dashboard
 *  - No active org, has a
 *    membership              → activate the first one, then /dashboard
 *  - No memberships          → /onboarding (fresh setup)
 *
 * Organization invitations: `__clerk_ticket` + `__clerk_status` are redirected to
 * `/sign-in` or `/sign-up` so Clerk `<SignIn />` / `<SignUp />` consume the ticket
 * (invited email is bound by Clerk, no custom `signIn.ticket()` flow).
 *
 * Loop guard: `/sign-in` redirects signed-in users here; if client state disagrees
 * with the server, we `signOut()` before `/sign-in` so the server stops bouncing.
 */
const BOUNCE_KEY = "cgi.postAuth.bounces";
const MAX_BOUNCES = 2;
const PENDING_ORG_INVITE_UNTIL_KEY = "cgi.pendingOrgInviteUntil";
const PENDING_ORG_INVITE_USER_KEY = "cgi.pendingOrgInviteUserId";
const INVITE_MEMBERSHIP_GRACE_MS = 45_000;
/** Cap polling so we do not hammer Clerk while membership propagates. */
const SERVER_MEMBERSHIP_POLL_MS = 5_000;
const MAX_GRACE_POLL_ATTEMPTS = 9;
const CLIENT_SETTLE_MS = 800;

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

function clearPendingOrgInviteMarkers(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_ORG_INVITE_UNTIL_KEY);
  window.sessionStorage.removeItem(PENDING_ORG_INVITE_USER_KEY);
}

function readPendingOrgInviteGraceDeadline(clerkUserId: string | undefined): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PENDING_ORG_INVITE_UNTIL_KEY);
  if (raw === null) return null;
  const until = Number.parseInt(raw, 10);
  if (!Number.isFinite(until)) return null;

  const storedUser = window.sessionStorage.getItem(PENDING_ORG_INVITE_USER_KEY);
  if (
    clerkUserId !== undefined &&
    clerkUserId !== "" &&
    storedUser !== null &&
    storedUser !== "" &&
    storedUser !== clerkUserId
  ) {
    clearPendingOrgInviteMarkers();
    return null;
  }

  return until;
}

type InviteStatus = "sign_in" | "sign_up" | "complete";

function parseInviteStatus(raw: string | null): InviteStatus | null {
  if (raw === null) return null;
  const s = raw.toLowerCase();
  if (s === "sign_in" || s === "sign_up" || s === "complete") return s;
  return null;
}

function PostAuthLoading(props?: { inviteRedirect?: boolean }) {
  const inviteRedirect = props?.inviteRedirect ?? false;
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span
        className="inline-block size-8 animate-spin rounded-full border-[3px] border-brand/20 border-t-brand"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">
        {inviteRedirect
          ? "Opening secure sign-in…"
          : "Setting up your workspace…"}
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">
        {inviteRedirect
          ? "You’ll finish accepting the invite on the next page. A quick verification step may appear — that’s Clerk protecting your organization."
          : "Almost done — connecting your account to your organization."}
      </p>
    </div>
  );
}

function PostAuthGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clerk = useClerk();
  const { isLoaded: authLoaded, isSignedIn, orgId, getToken } = useAuth();
  const { user } = useUser();
  const { isLoaded: listLoaded, userMemberships, setActive } = useOrganizationList({
    userMemberships: {
      pageSize: 50,
    },
  });

  const routed = useRef(false);
  const completeParamsStripped = useRef(false);
  const [stuck, setStuck] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const ticket = searchParams.get("__clerk_ticket");
  const inviteStatusRaw = searchParams.get("__clerk_status");
  const inviteStatus = parseInviteStatus(inviteStatusRaw);

  useEffect(() => {
    if (typeof window === "undefined" || user?.id === undefined || user.id === "") return;
    if (window.sessionStorage.getItem(PENDING_ORG_INVITE_UNTIL_KEY) === null) return;
    const stored = window.sessionStorage.getItem(PENDING_ORG_INVITE_USER_KEY);
    if (stored === null || stored === "") {
      window.sessionStorage.setItem(PENDING_ORG_INVITE_USER_KEY, user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authLoaded) return;
    if (!ticket || inviteStatusRaw === null) return;
    if (inviteStatus !== "sign_in" && inviteStatus !== "sign_up") return;

    if (isSignedIn) {
      router.replace("/post-auth");
      return;
    }

    sessionStorage.setItem(
      PENDING_ORG_INVITE_UNTIL_KEY,
      String(Date.now() + INVITE_MEMBERSHIP_GRACE_MS),
    );
    const qs = searchParams.toString();
    const target = inviteStatus === "sign_in" ? "/sign-in" : "/sign-up";
    const href = qs.length > 0 ? `${target}?${qs}` : target;
    // Full navigation avoids a long client transition where the gate spinner sits
    // on top of Clerk loading + Turnstile.
    if (typeof window !== "undefined") {
      window.location.replace(href);
    }
  }, [authLoaded, isSignedIn, ticket, inviteStatusRaw, inviteStatus, router, searchParams]);

  useEffect(() => {
    if (!ticket || inviteStatusRaw === null) return;
    if (inviteStatus !== null) return;
    setInviteError(
      `This invitation link is invalid or expired (status: ${inviteStatusRaw}). Request a new invite or sign in.`,
    );
  }, [ticket, inviteStatusRaw, inviteStatus]);

  useEffect(() => {
    if (completeParamsStripped.current) return;
    if (!ticket || inviteStatus !== "complete") return;
    completeParamsStripped.current = true;
    router.replace("/post-auth");
  }, [ticket, inviteStatus, router]);

  const userMembershipsRef = useRef(userMemberships);
  const listLoadedRef = useRef(listLoaded);
  userMembershipsRef.current = userMemberships;
  listLoadedRef.current = listLoaded;

  useEffect(() => {
    let cancelled = false;

    if (routed.current) return;
    if (!authLoaded) return;

    const invalidInviteParams =
      Boolean(ticket) && inviteStatusRaw !== null && inviteStatus === null;

    if (invalidInviteParams) return;

    const hasPendingInviteRedirect =
      Boolean(ticket) &&
      inviteStatusRaw !== null &&
      inviteStatus !== "complete" &&
      (inviteStatus === "sign_in" || inviteStatus === "sign_up");

    if (hasPendingInviteRedirect) return;

    if (!isSignedIn) {
      if (bumpBounces() >= MAX_BOUNCES) {
        routed.current = true;
        setStuck(true);
        return;
      }

      routed.current = true;
      void clerk.signOut({ redirectUrl: "/sign-in" });
      return;
    }

    clearBounces();

    if (orgId) {
      routed.current = true;
      clearPendingOrgInviteMarkers();
      router.replace("/dashboard");
      return;
    }

    const delay = (ms: number): Promise<void> =>
      new Promise((resolve) => {
        window.setTimeout(resolve, ms);
      });

    function navigateToOnboarding(): void {
      if (cancelled || routed.current) return;
      routed.current = true;
      clearPendingOrgInviteMarkers();
      router.replace("/onboarding");
    }

    async function activateOrgAndDashboard(clerkOrganizationId: string): Promise<void> {
      if (cancelled || routed.current) return;
      routed.current = true;
      clearPendingOrgInviteMarkers();
      try {
        if (setActive) {
          await setActive({ organization: clerkOrganizationId });
        }
      } finally {
        if (!cancelled) {
          router.replace("/dashboard");
        }
      }
    }

    async function fetchFirstClerkOrganizationIdFromServer(): Promise<string | null> {
      try {
        const token = await getToken();
        const res = await fetch("/api/auth/clerk-organization-ids", {
          credentials: "include",
          headers:
            token !== null && token !== ""
              ? { Authorization: `Bearer ${token}` }
              : {},
        });
        if (!res.ok) return null;
        const body: unknown = await res.json();
        if (
          typeof body !== "object" ||
          body === null ||
          !("organizationIds" in body) ||
          !Array.isArray((body as { organizationIds: unknown }).organizationIds)
        ) {
          return null;
        }
        const ids = (body as { organizationIds: unknown[] }).organizationIds;
        const id = ids[0];
        return typeof id === "string" && id.length > 0 ? id : null;
      } catch {
        return null;
      }
    }

    function tryClientMembershipOrgId(): string | null {
      const um = userMembershipsRef.current;
      const loaded = listLoadedRef.current;
      if (!loaded || !um || um.isLoading) return null;
      const row = um.data?.[0];
      return row !== undefined ? row.organization.id : null;
    }

    const clientOrgIdNow = tryClientMembershipOrgId();
    if (clientOrgIdNow !== null) {
      void activateOrgAndDashboard(clientOrgIdNow);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const graceDeadline = readPendingOrgInviteGraceDeadline(user?.id);
      const hasGrace = graceDeadline !== null && graceDeadline > Date.now();

      if (!hasGrace) {
        let serverOrgId = await fetchFirstClerkOrganizationIdFromServer();
        if (cancelled || routed.current) return;
        if (serverOrgId !== null) {
          await activateOrgAndDashboard(serverOrgId);
          return;
        }

        await delay(CLIENT_SETTLE_MS);
        if (cancelled || routed.current) return;

        const afterSettleClient = tryClientMembershipOrgId();
        if (afterSettleClient !== null) {
          await activateOrgAndDashboard(afterSettleClient);
          return;
        }

        serverOrgId = await fetchFirstClerkOrganizationIdFromServer();
        if (cancelled || routed.current) return;
        if (serverOrgId !== null) {
          await activateOrgAndDashboard(serverOrgId);
          return;
        }

        navigateToOnboarding();
        return;
      }

      let gracePolls = 0;
      while (
        !cancelled &&
        !routed.current &&
        Date.now() < graceDeadline &&
        gracePolls < MAX_GRACE_POLL_ATTEMPTS
      ) {
        const cid = tryClientMembershipOrgId();
        if (cid !== null) {
          await activateOrgAndDashboard(cid);
          return;
        }

        const serverOrgId = await fetchFirstClerkOrganizationIdFromServer();
        if (cancelled || routed.current) return;
        if (serverOrgId !== null) {
          await activateOrgAndDashboard(serverOrgId);
          return;
        }

        gracePolls += 1;
        await delay(SERVER_MEMBERSHIP_POLL_MS);
      }

      if (cancelled || routed.current) return;

      const cid = tryClientMembershipOrgId();
      if (cid !== null) {
        await activateOrgAndDashboard(cid);
        return;
      }

      const lastChance = await fetchFirstClerkOrganizationIdFromServer();
      if (cancelled || routed.current) return;
      if (lastChance !== null) {
        await activateOrgAndDashboard(lastChance);
        return;
      }

      navigateToOnboarding();
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authLoaded,
    isSignedIn,
    orgId,
    listLoaded,
    userMemberships,
    setActive,
    router,
    clerk,
    ticket,
    inviteStatusRaw,
    inviteStatus,
    user?.id,
    getToken,
  ]);

  if (inviteError !== null) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">Couldn&apos;t finish your invitation</h1>
          <p className="max-w-md text-sm text-muted-foreground">{inviteError}</p>
        </div>
        <Button
          onClick={() => {
            clearBounces();
            void clerk.signOut({ redirectUrl: "/sign-in" });
          }}
          className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
        >
          Sign in
        </Button>
      </div>
    );
  }

  if (stuck) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">Your session expired</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            We couldn&apos;t resume where you left off. Sign in again to continue — this
            usually happens when a session is revoked or cookies get out of sync across
            tabs.
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

  const inviteRedirectPending =
    Boolean(ticket) &&
    inviteStatus !== null &&
    (inviteStatus === "sign_in" || inviteStatus === "sign_up") &&
    !isSignedIn;

  return <PostAuthLoading inviteRedirect={inviteRedirectPending} />;
}

export default function PostAuthPage() {
  return (
    <Suspense fallback={<PostAuthLoading />}>
      <PostAuthGate />
    </Suspense>
  );
}
