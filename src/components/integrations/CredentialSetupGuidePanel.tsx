import { ExternalLink } from "lucide-react";

import type { CredentialSetupGuide } from "@/lib/integration-credential-guides";

type CredentialSetupGuidePanelProps = {
  guide: CredentialSetupGuide;
};

/** Numbered how-to for generating API/IAM credentials on the connect form. */
export function CredentialSetupGuidePanel({
  guide,
}: CredentialSetupGuidePanelProps) {
  return (
    <div className="rounded-md border border-border/80 bg-muted/30 px-3 py-3">
      <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {guide.title}
      </p>
      <ol className="m-0 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-foreground">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {guide.docsUrl ? (
        <a
          href={guide.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 inline-flex items-center gap-1 text-[11px] text-primary underline-offset-2 hover:underline"
        >
          {guide.docsLabel ?? "Provider documentation"}
          <ExternalLink className="size-3" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}
