import { Shield } from "lucide-react";

import { cn } from "@/lib/utils";

type EvidenceHashCellProps = {
  fileHash: string | null;
  verified?: boolean;
  className?: string;
};

export function EvidenceHashCell({
  fileHash,
  verified = true,
  className,
}: EvidenceHashCellProps) {
  if (!fileHash) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>—</span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 font-mono text-[9.5px]",
        verified ? "text-emerald-800" : "text-muted-foreground",
        className
      )}
      title={fileHash}
    >
      <Shield className="size-3 shrink-0" aria-hidden />
      <span>{fileHash.slice(0, 6)}…</span>
    </div>
  );
}
