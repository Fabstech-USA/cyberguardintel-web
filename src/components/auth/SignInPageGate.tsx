"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import {
  AuthTicketRedirect,
  ClerkSignInFlow,
} from "@/components/auth/ClerkAuthFlow";

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
    return <AuthTicketRedirect label="Taking you to sign up…" />;
  }

  const invite = ticket !== null && ticket !== "" && status !== "sign_up";

  return <ClerkSignInFlow invite={invite} />;
}
