import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { MarketingHomePage } from "@/components/marketing/MarketingHomePage";

export const metadata: Metadata = {
  title: "CyberGuardIntel AI | HIPAA compliance readiness",
  description:
    "Know your HIPAA readiness before the audit does. AI policy drafts, control-mapped evidence from integrations, and one-click audit packages. 14-day free trial.",
};

/**
 * Marketing homepage for signed-out visitors.
 * Signed-in users continue into the app shell via /post-auth.
 */
export default async function Home(): Promise<React.JSX.Element> {
  const { userId } = await auth();

  if (userId) {
    redirect("/post-auth");
  }

  return <MarketingHomePage />;
}
