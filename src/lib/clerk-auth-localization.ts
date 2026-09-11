import type { LocalizationResource } from "@clerk/shared/types";

/**
 * Clerk `<SignIn />` / `<SignUp />` copy mapped from the previous custom forms.
 * Passed on `<ClerkProvider>` because Clerk v7 does not take `localization` on the
 * individual components.
 */
export const clerkAuthLocalization = {
  socialButtonsBlockButton: "Continue with {{provider}}",
  // Clerk swaps to this shorter label (just the provider name) once 3+ OAuth
  // providers are enabled and lays them out in a compact grid. We force that
  // grid back to a single full-width column (see clerk-embedded-appearance),
  // so keep the same "Continue with …" wording here too.
  socialButtonsBlockButtonManyInView: "Continue with {{provider}}",
  formFieldLabel__emailAddress: "Work email",
  formFieldInputPlaceholder__emailAddress: "you@yourclinic.com",
  formFieldLabel__password: "Password",
  formFieldInputPlaceholder__password: "Enter your password",
  formFieldInputPlaceholder__signUpPassword: "At least 12 characters",
  formFieldAction__forgotPassword: "Forgot password?",
  dividerText: "or",
  backButton: "Back to sign in",
  signIn: {
    start: {
      title: "Welcome back",
      titleCombined: "Welcome back",
      subtitle: "Sign in to your CyberGuardIntel workspace.",
      subtitleCombined: "Sign in to your CyberGuardIntel workspace.",
    },
    totpMfa: {
      title: "Enter your authenticator code",
      subtitle:
        "Open your authenticator app and enter the 6-digit code for CyberGuardIntel.",
      formTitle: "Verification code",
    },
    phoneCodeMfa: {
      title: "Enter the SMS code",
      subtitle: "We sent a 6-digit code to the phone number on your account.",
      formTitle: "Verification code",
    },
    emailCodeMfa: {
      title: "Check your email",
      subtitle: "We sent a 6-digit code to the email on your account.",
      formTitle: "Verification code",
    },
    backupCodeMfa: {
      title: "Enter a backup code",
      subtitle:
        "Use one of the one-time backup codes you saved when setting up 2FA.",
    },
    alternativeMethods: {
      blockButton__backupCode: "Use a backup code instead",
    },
  },
  signUp: {
    start: {
      title: "Create your account",
      titleCombined: "Create your account",
      subtitle: "Start your 14-day free trial. No card required.",
      subtitleCombined: "Start your 14-day free trial. No card required.",
    },
    emailCode: {
      title: "Check your inbox",
      subtitle: "We sent a 6-digit code to {{identifier}}.",
      formTitle: "Verification code",
    },
  },
} satisfies LocalizationResource;
