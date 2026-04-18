import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/post-auth");
  }

  return (
    <div className="space-y-8">
      <AuthTabs active="sign-up" />
      <SignUpForm />
      <AuthFooter />
    </div>
  );
}
