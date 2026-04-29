import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInPageGate } from "@/components/auth/SignInPageGate";
import { AuthRouteSuspenseFallback } from "@/components/auth/AuthRouteSuspenseFallback";

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/post-auth");
  }

  return (
    <Suspense fallback={<AuthRouteSuspenseFallback />}>
      <SignInPageGate />
    </Suspense>
  );
}
