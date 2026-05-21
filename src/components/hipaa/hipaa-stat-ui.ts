/** Shared HIPAA dashboard stat card styles (training + BAA tracker). */
export const hipaaStatUi = {
  statCard:
    "rounded-lg border-0 bg-[#f5f5f0] py-0 shadow-none dark:border dark:border-border dark:bg-muted",
  statLabel: "text-xs text-[#6b6b6b] dark:text-muted-foreground",
  statDefault: "text-[#1a1a1a] dark:text-foreground",
  statOk: "text-[#3B6D11] dark:text-emerald-400",
  statWarn: "text-[#854F0B] dark:text-amber-400",
  statDanger: "text-[#A32D2D] dark:text-red-400",
  pageDesc: "text-sm text-[#6b6b6b] dark:text-muted-foreground",
} as const;
