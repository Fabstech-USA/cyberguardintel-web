import type { ComponentProps } from "react";
import type { SignIn } from "@clerk/nextjs";

/**
 * Shared styling for Clerk `<SignIn />` / `<SignUp />` on our auth routes so they
 * match shadcn tokens instead of Clerk’s default purple shell.
 */
export type ClerkEmbeddedAppearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

export const clerkEmbeddedAppearance: ClerkEmbeddedAppearance = {
  elements: {
    rootBox: "w-full",
    card: "bg-card shadow-sm border border-border rounded-xl",
    headerTitle: "text-foreground text-[17px] font-semibold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButton: "border border-border bg-background text-foreground",
    formButtonPrimary:
      "bg-brand text-brand-foreground hover:bg-brand-hover shadow-none",
    formButtonReset: "text-muted-foreground",
    footerAction: "text-muted-foreground",
    footerActionLink: "text-brand font-medium",
    formFieldLabel: "text-foreground",
    formFieldInput: "bg-background border-input text-foreground",
    formFieldInputShowPasswordButton: "text-muted-foreground",
    identityPreviewText: "text-foreground",
    identityPreviewEditButton: "text-brand",
    formFieldHintText: "text-muted-foreground",
    formFieldErrorText: "text-destructive",
    alternativeMethodsBlockButton: "border-border",
    otpCodeFieldInput: "border-input bg-background text-foreground",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground",
    /** Brings the loading spinner closer to app chrome */
    spinner: "border-brand/30 border-t-brand",
  },
};
