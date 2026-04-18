import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <span
        className="inline-block size-8 animate-spin rounded-full border-[3px] border-brand/20 border-t-brand"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">Finishing sign-in…</p>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/post-auth"
        signUpForceRedirectUrl="/post-auth"
      />
    </div>
  );
}
