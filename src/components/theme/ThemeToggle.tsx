"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

type Mode = "light" | "dark" | "system";

const OPTIONS: { value: Mode; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const active: Mode = mounted ? ((theme as Mode) ?? "system") : "system";

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5",
        className
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = mounted && active === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none",
              "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              selected &&
                "bg-background text-foreground shadow-xs ring-1 ring-border/70"
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
