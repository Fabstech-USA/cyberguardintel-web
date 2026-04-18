"use client";

import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs";

import { cn } from "@/lib/utils";

type OAuthStrategy = "oauth_google" | "oauth_microsoft";
type Mode = "sign-up" | "sign-in";

type OAuthButtonsProps = {
  mode: Mode;
  disabled?: boolean;
};

const REDIRECT_CALLBACK_URL = "/sso-callback";
const AFTER_AUTH_URL = "/post-auth";

export function OAuthButtons({ mode, disabled }: OAuthButtonsProps) {
  const { signUp } = useSignUp();
  const { signIn } = useSignIn();
  const [pending, setPending] = useState<OAuthStrategy | null>(null);

  async function handleStrategy(strategy: OAuthStrategy) {
    if (pending) return;
    setPending(strategy);
    try {
      if (mode === "sign-up" && signUp) {
        await signUp.sso({
          strategy,
          redirectUrl: AFTER_AUTH_URL,
          redirectCallbackUrl: REDIRECT_CALLBACK_URL,
        });
      } else if (signIn) {
        await signIn.sso({
          strategy,
          redirectUrl: AFTER_AUTH_URL,
          redirectCallbackUrl: REDIRECT_CALLBACK_URL,
        });
      }
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <OAuthButton
        onClick={() => handleStrategy("oauth_google")}
        disabled={disabled || pending !== null}
        loading={pending === "oauth_google"}
        label={`Continue with Google`}
        icon={<GoogleIcon />}
      />
      <OAuthButton
        onClick={() => handleStrategy("oauth_microsoft")}
        disabled={disabled || pending !== null}
        loading={pending === "oauth_microsoft"}
        label={`Continue with Microsoft`}
        icon={<MicrosoftIcon />}
      />
    </div>
  );
}

function OAuthButton({
  onClick,
  disabled,
  loading,
  label,
  icon,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={loading}
      className={cn(
        "relative inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground shadow-xs transition-colors outline-none",
        "hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-60"
      )}
    >
      <span className="flex size-5 items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
      <path
        d="M19.6 10.23c0-.68-.06-1.36-.18-2.02H10v3.83h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.22c1.89-1.74 2.98-4.3 2.98-7.33Z"
        fill="#4285F4"
      />
      <path
        d="M10 20c2.7 0 4.96-.9 6.6-2.44l-3.22-2.5c-.9.6-2.05.95-3.38.95-2.6 0-4.8-1.75-5.59-4.1H1.07v2.58A9.99 9.99 0 0 0 10 20Z"
        fill="#34A853"
      />
      <path
        d="M4.41 11.9a6 6 0 0 1 0-3.81V5.52H1.07a10 10 0 0 0 0 8.97l3.34-2.59Z"
        fill="#FBBC05"
      />
      <path
        d="M10 3.96c1.47-.02 2.88.53 3.96 1.54l2.85-2.85A9.93 9.93 0 0 0 10 0 9.99 9.99 0 0 0 1.07 5.52l3.34 2.58C5.2 5.72 7.4 3.96 10 3.96Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
      <rect x="1" y="1" width="8.5" height="8.5" fill="#F25022" />
      <rect x="10.5" y="1" width="8.5" height="8.5" fill="#7FBA00" />
      <rect x="1" y="10.5" width="8.5" height="8.5" fill="#00A4EF" />
      <rect x="10.5" y="10.5" width="8.5" height="8.5" fill="#FFB900" />
    </svg>
  );
}
