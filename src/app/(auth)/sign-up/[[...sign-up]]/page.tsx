import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignUpPageGate } from "@/components/auth/SignUpPageGate";
import { AuthRouteSuspenseFallback } from "@/components/auth/AuthRouteSuspenseFallback";

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/post-auth");
  }

  return (
    <Suspense fallback={<AuthRouteSuspenseFallback />}>
      <SignUpPageGate />
    </Suspense>
  );
}
