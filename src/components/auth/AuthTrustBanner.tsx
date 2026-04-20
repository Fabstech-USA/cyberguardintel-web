import { ShieldCheck } from "lucide-react";

export function AuthTrustBanner(): React.JSX.Element {
  return (
    <p className="inline-flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
      <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
      <span>MFA enforced on all plans · SOC 2 and HIPAA aligned</span>
    </p>
  );
}
