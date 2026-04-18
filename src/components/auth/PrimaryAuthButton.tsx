import * as React from "react";

import { cn } from "@/lib/utils";

type PrimaryAuthButtonProps = React.ComponentProps<"button"> & {
  loading?: boolean;
};

export function PrimaryAuthButton({
  className,
  children,
  loading,
  disabled,
  ...props
}: PrimaryAuthButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-xs transition-colors outline-none",
        "hover:bg-brand-hover active:bg-brand-active",
        "focus-visible:ring-3 focus-visible:ring-brand-ring",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      {loading ? (
        <span
          className="inline-block size-4 animate-spin rounded-full border-2 border-brand-foreground/30 border-t-brand-foreground"
          aria-hidden="true"
        />
      ) : null}
      <span className="inline-flex items-center gap-1.5">{children}</span>
    </button>
  );
}
