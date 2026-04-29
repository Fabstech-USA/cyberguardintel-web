"use client";

import { useState, type FormEvent } from "react";
import { useSignUp } from "@clerk/nextjs";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PrimaryAuthButton } from "@/components/auth/PrimaryAuthButton";

const AFTER_SIGN_UP_URL = "/post-auth";

export function SignUpForm() {
  const { signUp } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<"form" | "verify">("form");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signUp || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await signUp.password({
        emailAddress: email,
        password,
      });
      if (error) {
        setError(error.message);
        return;
      }

      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: () => {
            window.location.assign(AFTER_SIGN_UP_URL);
          },
        });
        return;
      }

      if (signUp.unverifiedFields.includes("email_address")) {
        const { error: sendError } = await signUp.verifications.sendEmailCode();
        if (sendError) {
          setError(sendError.message);
          return;
        }
        setStage("verify");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signUp || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code });
      if (error) {
        setError(error.message);
        return;
      }

      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: () => {
            window.location.assign(AFTER_SIGN_UP_URL);
          },
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === "verify") {
    return (
      <form className="space-y-5" onSubmit={onVerify} noValidate>
        <div className="space-y-1.5">
          <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
            Check your inbox
          </h2>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            required
            className="h-11 tracking-[0.35em] text-center text-base"
            placeholder="••••••"
          />
        </div>

        {error ? <FormError message={error} /> : null}

        <PrimaryAuthButton
          type="submit"
          disabled={submitting || code.length < 6}
          loading={submitting}
        >
          Verify email
        </PrimaryAuthButton>

        <button
          type="button"
          onClick={() => {
            setStage("form");
            setCode("");
            setError(null);
          }}
          className="w-full text-center text-[13px] text-muted-foreground hover:text-foreground"
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <div className="space-y-1.5">
        <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
          Create your account
        </h2>
        <p className="text-sm text-muted-foreground">
          Start your 14-day free trial — no card required.
        </p>
      </div>

      <OAuthButtons mode="sign-up" disabled={submitting} />

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
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 12 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
            className="h-11"
          />
        </div>
      </div>

      {error ? <FormError message={error} /> : null}

      <PrimaryAuthButton
        type="submit"
        disabled={submitting || !email || password.length < 12}
        loading={submitting}
      >
        Create account <span aria-hidden="true">→</span>
      </PrimaryAuthButton>
    </form>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
    >
      {message}
    </p>
  );
}
