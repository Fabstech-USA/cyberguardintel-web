import type { ComponentProps } from "react";
import type { SignIn } from "@clerk/nextjs";

/**
 * Shared styling for Clerk `<SignIn />` / `<SignUp />` on our auth routes so they
 * match shadcn tokens instead of Clerk’s default purple shell.
 */
export type ClerkEmbeddedAppearance = NonNullable<
  ComponentProps<typeof SignIn>["appearance"]
>;

export function clerkEmbeddedAppearance(options?: {
  /** Flatten the Clerk card so it sits under our AuthTabs like the old custom form. */
  flush?: boolean;
  /** Hide Clerk’s “already have an account” footer when we render AuthTabs. */
  hideSwitchLinks?: boolean;
  /** Hide Clerk’s own title/subtitle when we render invite-specific headings. */
  hideHeader?: boolean;
}): ClerkEmbeddedAppearance {
  const flush = options?.flush ?? true;
  const hideSwitchLinks = options?.hideSwitchLinks ?? true;
  const hideHeader = options?.hideHeader ?? false;

  return {
    theme: "simple",
    variables: {
      colorPrimary: "var(--brand)",
      colorPrimaryForeground: "var(--brand-foreground)",
      colorForeground: "var(--foreground)",
      colorMutedForeground: "var(--muted-foreground)",
      colorBackground: "var(--background)",
      colorInput: "var(--background)",
      colorInputForeground: "var(--foreground)",
      colorDanger: "var(--destructive)",
      colorRing: "var(--brand-ring)",
      fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
      borderRadius: "0.5rem",
    },
    options: {
      socialButtonsPlacement: "top",
      socialButtonsVariant: "blockButton",
      logoPlacement: "none",
      termsPageUrl: "/legal/terms",
      privacyPageUrl: "/legal/privacy",
    },
    elements: {
      rootBox: "w-full",
      cardBox: flush ? "w-full shadow-none" : "w-full",
      card: flush
        ? "bg-transparent shadow-none border-0 p-0 gap-5"
        : "bg-card shadow-sm border border-border rounded-xl",
      header: hideHeader ? "hidden" : undefined,
      headerTitle:
        "text-foreground text-[22px] font-semibold leading-tight tracking-tight",
      headerSubtitle: "text-sm text-muted-foreground",
      logoBox: "hidden",
      logoImage: "hidden",
      /**
       * Clerk switches the social row to a fixed 3-column grid once 3+ OAuth
       * providers are enabled, which squeezes "Continue with Microsoft" until
       * it clips. Force a single column so every provider keeps a full-width
       * row like the old stacked OAuth buttons.
       */
      socialButtons: "grid-cols-1! gap-2",
      socialButtonsBlockButton:
        "h-11 w-full border border-border bg-background text-foreground shadow-xs hover:bg-muted/60",
      socialButtonsBlockButtonText:
        "text-sm font-medium text-foreground whitespace-nowrap",
      dividerRow: "my-1",
      dividerLine: "bg-border",
      dividerText:
        "text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground",
      form: "gap-4",
      formFieldLabel: "text-foreground",
      formFieldInput: "h-11 bg-background border-input text-foreground",
      formFieldInputShowPasswordButton: "text-muted-foreground",
      formFieldHintText: "text-muted-foreground",
      formFieldErrorText: "text-destructive",
      formButtonPrimary:
        "h-11 bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active shadow-none text-sm font-semibold",
      formButtonReset: "text-muted-foreground",
      footer: hideSwitchLinks ? "hidden" : undefined,
      footerAction: hideSwitchLinks ? "hidden" : "text-muted-foreground",
      footerActionLink: "text-brand font-medium",
      identityPreviewText: "text-foreground",
      identityPreviewEditButton: "text-brand",
      alternativeMethodsBlockButton: "border-border",
      otpCodeFieldInput: "border-input bg-background text-foreground",
      spinner: "border-brand/30 border-t-brand",
    },
  };
}
