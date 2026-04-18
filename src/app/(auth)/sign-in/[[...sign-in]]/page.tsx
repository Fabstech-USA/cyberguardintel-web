import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { SignInForm } from "@/components/auth/SignInForm";

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/post-auth");
  }

  return (
    <div className="space-y-8">
      <AuthTabs active="sign-in" />
      <SignInForm />
    </div>
  );
}
