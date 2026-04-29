"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PrimaryAuthButton } from "@/components/auth/PrimaryAuthButton";

const AFTER_SIGN_IN_URL = "/post-auth";

type MfaStrategy = "totp" | "phone_code" | "email_code" | "backup_code";

export function SignInForm() {
  const { signIn } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stage, setStage] = useState<"credentials" | "mfa">("credentials");
  const [mfaStrategy, setMfaStrategy] = useState<MfaStrategy>("totp");
  const [code, setCode] = useState("");

  async function finalizeSession() {
    if (!signIn) return;
    // Hard navigation so the server re-renders with the freshly-set Clerk
    // session cookie. A soft `router.push` races against setActive() and can
    // land the user back on /sign-in before the cookie propagates.
    await signIn.finalize({
      navigate: () => {
        window.location.assign(AFTER_SIGN_IN_URL);
      },
    });
  }

  async function startSecondFactor() {
    if (!signIn) return;
    const factors = signIn.supportedSecondFactors ?? [];
    const strategies = new Set(factors.map((f) => f.strategy));

    // Prefer TOTP (no network round-trip), then phone, then email.
    if (strategies.has("totp")) {
      setMfaStrategy("totp");
      setStage("mfa");
      return;
    }
    if (strategies.has("phone_code")) {
      setMfaStrategy("phone_code");
      const { error: sendError } = await signIn.mfa.sendPhoneCode();
      if (sendError) {
        setError(sendError.message);
        return;
      }
      setStage("mfa");
      return;
    }
    if (strategies.has("email_code")) {
      setMfaStrategy("email_code");
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      if (sendError) {
        setError(sendError.message);
        return;
      }
      setStage("mfa");
      return;
    }

    setError(
      "Two-factor authentication is required, but no supported method is configured on this account."
    );
  }

  async function onSubmitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signIn || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await signIn.password({
        identifier: email,
        password,
      });
      if (error) {
        setError(error.message);
        return;
      }

      if (signIn.status === "complete") {
        await finalizeSession();
        return;
      }

      if (signIn.status === "needs_second_factor") {
        await startSecondFactor();
        return;
      }

      setError(`Unable to continue sign-in (status: ${signIn.status}).`);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signIn || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      let verifyError: { message: string } | null = null;
      if (mfaStrategy === "totp") {
        ({ error: verifyError } = await signIn.mfa.verifyTOTP({ code }));
      } else if (mfaStrategy === "phone_code") {
        ({ error: verifyError } = await signIn.mfa.verifyPhoneCode({ code }));
      } else if (mfaStrategy === "email_code") {
        ({ error: verifyError } = await signIn.mfa.verifyEmailCode({ code }));
      } else {
        ({ error: verifyError } = await signIn.mfa.verifyBackupCode({ code }));
      }

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      if (signIn.status === "complete") {
        await finalizeSession();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function useBackupCode() {
    setError(null);
    setCode("");
    setMfaStrategy("backup_code");
  }

  async function resendCode() {
    if (!signIn) return;
    setError(null);
    setSubmitting(true);
    try {
      if (mfaStrategy === "phone_code") {
        await signIn.mfa.sendPhoneCode();
      } else if (mfaStrategy === "email_code") {
        await signIn.mfa.sendEmailCode();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === "mfa") {
    const isBackup = mfaStrategy === "backup_code";
    const { heading, hint, placeholder, autoComplete, maxLength, inputMode } =
      mfaUiConfig(mfaStrategy);

    return (
      <form className="space-y-5" onSubmit={onSubmitMfa} noValidate>
        <div className="space-y-1.5">
          <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
            {heading}
          </h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mfa-code">
            {isBackup ? "Backup code" : "Verification code"}
          </Label>
          <Input
            id="mfa-code"
            name="mfa-code"
            type="text"
            inputMode={inputMode}
            autoComplete={autoComplete}
            maxLength={maxLength}
            value={code}
            onChange={(e) =>
              setCode(
                isBackup
                  ? e.target.value.trim().slice(0, maxLength)
                  : e.target.value.replace(/\D/g, "").slice(0, maxLength)
              )
            }
            required
            placeholder={placeholder}
            className={
              isBackup
                ? "h-11"
                : "h-11 text-center text-base tracking-[0.35em]"
            }
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
          >
            {error}
          </p>
        ) : null}

        <PrimaryAuthButton
          type="submit"
          disabled={submitting || code.length < (isBackup ? 8 : 6)}
          loading={submitting}
        >
          Verify and sign in
        </PrimaryAuthButton>

        <div className="flex flex-col items-center gap-1.5 text-[13px] text-muted-foreground">
          {(mfaStrategy === "phone_code" || mfaStrategy === "email_code") && (
            <button
              type="button"
              onClick={resendCode}
              disabled={submitting}
              className="hover:text-foreground"
            >
              Resend code
            </button>
          )}
          {!isBackup && (
            <button
              type="button"
              onClick={useBackupCode}
              className="hover:text-foreground"
            >
              Use a backup code instead
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setStage("credentials");
              setCode("");
              setError(null);
            }}
            className="hover:text-foreground"
          >
            Back to sign in
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={onSubmitCredentials} noValidate>
      <div className="space-y-1.5">
        <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
          Welcome back
        </h2>
        <p className="text-sm text-muted-foreground">
          Sign in to your CyberGuardIntel workspace.
        </p>
      </div>

      <OAuthButtons mode="sign-in" disabled={submitting} />

      <AuthDivider />

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@yourclinic.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/sign-in/reset"
              className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11"
          />
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
        >
          {error}
        </p>
      ) : null}

      <PrimaryAuthButton
        type="submit"
        disabled={submitting || !email || !password}
        loading={submitting}
      >
        Sign in <span aria-hidden="true">→</span>
      </PrimaryAuthButton>
    </form>
  );
}

function mfaUiConfig(strategy: MfaStrategy): {
  heading: string;
  hint: string;
  placeholder: string;
  autoComplete: string;
  maxLength: number;
  inputMode: "numeric" | "text";
} {
  switch (strategy) {
    case "totp":
      return {
        heading: "Enter your authenticator code",
        hint: "Open your authenticator app and enter the 6-digit code for CyberGuardIntel.",
        placeholder: "••••••",
        autoComplete: "one-time-code",
        maxLength: 6,
        inputMode: "numeric",
      };
    case "phone_code":
      return {
        heading: "Enter the SMS code",
        hint: "We sent a 6-digit code to the phone number on your account.",
        placeholder: "••••••",
        autoComplete: "one-time-code",
        maxLength: 6,
        inputMode: "numeric",
      };
    case "email_code":
      return {
        heading: "Check your email",
        hint: "We sent a 6-digit code to the email on your account.",
        placeholder: "••••••",
        autoComplete: "one-time-code",
        maxLength: 6,
        inputMode: "numeric",
      };
    case "backup_code":
      return {
        heading: "Enter a backup code",
        hint: "Use one of the one-time backup codes you saved when setting up 2FA.",
        placeholder: "XXXX-XXXX",
        autoComplete: "one-time-code",
        maxLength: 24,
        inputMode: "text",
      };
  }
}
