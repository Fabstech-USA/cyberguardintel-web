"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import {
  AuthTicketRedirect,
  ClerkSignUpFlow,
} from "@/components/auth/ClerkAuthFlow";

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
    return <AuthTicketRedirect label="Taking you to sign in…" />;
  }

  const invite = ticket !== null && ticket !== "" && status !== "sign_in";

  return <ClerkSignUpFlow invite={invite} />;
}
