import { ENTERPRISE_SALES_EMAIL } from "@/lib/plans";

export const TRIAL_HREF = "/sign-up";
export const SIGN_IN_HREF = "/sign-in";

export const DEMO_MAILTO = `mailto:${ENTERPRISE_SALES_EMAIL}?subject=${encodeURIComponent(
  "Book a CyberGuardIntel demo"
)}`;
