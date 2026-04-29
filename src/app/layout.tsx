import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ClerkCaptchaHost } from "@/components/clerk/ClerkCaptchaHost";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CyberGuardIntel",
  description: "Compliance readiness platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider afterSignOutUrl="/sign-in">
            {/*
              Smart CAPTCHA mounts into #clerk-captcha. Hidden outside auth routes
              so Turnstile does not stay on screen after navigating to the app.
            */}
            <ClerkCaptchaHost />
            {children}
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
