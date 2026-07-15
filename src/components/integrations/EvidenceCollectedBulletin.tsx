import { FileStack } from "lucide-react";

type EvidenceCollectedBulletinProps = {
  items: string[];
  className?: string;
};

/** Compact bulletin of evidence collected after connecting an integration. */
export function EvidenceCollectedBulletin({
  items,
  className,
}: EvidenceCollectedBulletinProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={
        className ??
        "rounded-md border border-border/80 bg-muted/30 px-3 py-3"
      }
    >
      <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        <FileStack className="size-3.5" aria-hidden />
        Evidence we&apos;ll collect
      </p>
      <ul className="m-0 list-disc space-y-1 pl-4 text-xs leading-relaxed text-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
